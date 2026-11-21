import { Inject, Injectable } from '@nestjs/common';
import type {
  AccessEventType,
  BarrierResult,
  CobroSummary,
  EventoAccesoRecord,
  SedeConfig,
  VehicleType,
} from '../../../domain/access/access.types';
import { resolveChargeExitState } from '../../../domain/access/charge-exit-state';
import { calculateOperationalDay } from '../../../domain/access/operational-day.calculator';
import { PlateClassifier } from '../../../domain/access/plate-classifier';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import {
  BILLING_GENERATOR_PORT,
  type IBillingGeneratorPort,
} from '../../../domain/ports/billing-generator.port';
import { CLOCK_PORT, type IClock } from '../../../domain/ports/clock.port';
import {
  COBRO_CONSULTA_REPOSITORY_PORT,
  type ICobroConsultaRepository,
} from '../../../domain/ports/cobro-consulta.repository.port';
import {
  CUPO_REPOSITORY_PORT,
  type ICupoRepository,
} from '../../../domain/ports/cupo.repository.port';
import {
  EVENTO_ACCESO_REPOSITORY_PORT,
  type IEventoAccesoRepository,
} from '../../../domain/ports/evento-acceso.repository.port';
import {
  SEDE_CONFIG_REPOSITORY_PORT,
  type ISedeConfigRepository,
} from '../../../domain/ports/sede-config.repository.port';
import { CapacityReservationHandler } from './handlers/capacity-reservation.handler';
import type { EntryValidationContext } from './handlers/entry-validation.handler';

export type ManualValidationAction = 'CONFIRMAR' | 'DESCARTAR';

export interface ValidateManualAccessCommand {
  sedeId: number;
  tipoEvento: AccessEventType;
  accion: ManualValidationAction;
  placaCorregida?: string;
  confianzaOriginal?: number;
  usuarioId?: number;
}

export interface ValidateManualAccessResult {
  descartado: boolean;
  resultadoBarrera: BarrierResult;
  motivo: string;
  evento: EventoAccesoRecord | null;
  cobro: CobroSummary | null;
}

/**
 * ID por defecto del operador semilla (`operador@parqueadero.local` en `02-seed.sql`).
 * Garantiza el cumplimiento de `ck_eventos_manual_con_usuario` en PostgreSQL
 * (`NOT lectura_manual OR usuario_id IS NOT NULL`) cuando el operador interviene manualmente.
 */
const DEFAULT_OPERATOR_USER_ID = 2;

/**
 * Caso de uso HU-04: procesa la validación, corrección o descarte manual del operador
 * cuando la lectura LPR cae por debajo del umbral de confianza de la sede.
 */
@Injectable()
export class ValidateManualAccessUseCase {
  constructor(
    @Inject(SEDE_CONFIG_REPOSITORY_PORT)
    private readonly sedeConfigRepository: ISedeConfigRepository,
    @Inject(CUPO_REPOSITORY_PORT)
    private readonly cupoRepository: ICupoRepository,
    @Inject(EVENTO_ACCESO_REPOSITORY_PORT)
    private readonly eventoAccesoRepository: IEventoAccesoRepository,
    @Inject(COBRO_CONSULTA_REPOSITORY_PORT)
    private readonly cobroConsultaRepository: ICobroConsultaRepository,
    @Inject(BILLING_GENERATOR_PORT)
    private readonly billingGenerator: IBillingGeneratorPort,
    @Inject(CLOCK_PORT)
    private readonly clock: IClock,
    private readonly plateClassifier: PlateClassifier = new PlateClassifier(),
  ) {}

  async execute(
    command: ValidateManualAccessCommand,
  ): Promise<ValidateManualAccessResult> {
    const sede = await this.sedeConfigRepository.findActiveById(command.sedeId);
    if (!sede) {
      throw new DomainNotFoundException(
        `No se encontró una sede activa con id ${command.sedeId}.`,
        'SITE_NOT_FOUND',
      );
    }

    if (command.accion === 'DESCARTAR') {
      return {
        descartado: true,
        resultadoBarrera: 'CERRADA',
        motivo:
          'Barrera Cerrada: Lectura descartada manualmente por el operador (LECTURA_MANUAL)',
        evento: null,
        cobro: null,
      };
    }

    const rawPlate = (command.placaCorregida ?? '').trim();
    if (!rawPlate) {
      throw new BusinessValidationException(
        'Debe ingresar una placa válida para confirmar la lectura manual.',
        'INVALID_PLATE_FORMAT',
      );
    }

    const { placa, tipoVehiculo } = this.plateClassifier.classify(rawPlate);
    const confianzaLectura = command.confianzaOriginal ?? 0;
    const usuarioId = command.usuarioId ?? DEFAULT_OPERATOR_USER_ID;

    if (command.tipoEvento === 'SALIDA') {
      return this.confirmManualExit({
        sede,
        placa,
        tipoVehiculo,
        confianzaLectura,
        usuarioId,
      });
    }

    return this.confirmManualEntry({
      sede,
      placa,
      tipoVehiculo,
      confianzaLectura,
      usuarioId,
    });
  }

  private async confirmManualEntry(params: {
    sede: SedeConfig;
    placa: string;
    tipoVehiculo: VehicleType;
    confianzaLectura: number;
    usuarioId: number;
  }): Promise<ValidateManualAccessResult> {
    const { sede, placa, tipoVehiculo, confianzaLectura, usuarioId } = params;

    const capacityHandler = new CapacityReservationHandler(this.cupoRepository);
    const context: EntryValidationContext = {
      sede,
      placa,
      tipoVehiculo,
      confianzaLectura,
    };

    const blocked = await capacityHandler.handle(context);
    if (blocked) {
      return {
        descartado: false,
        resultadoBarrera: blocked.resultadoBarrera,
        motivo: blocked.motivo,
        evento: null,
        cobro: null,
      };
    }

    const now = this.clock.now();
    const motivo =
      'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)';

    let evento: EventoAccesoRecord;
    try {
      evento = await this.eventoAccesoRepository.create({
        sedeId: sede.id,
        tipoVehiculo,
        usuarioId,
        placa,
        tipoEvento: 'ENTRADA',
        confianzaLectura,
        lecturaManual: true,
        fechaHora: now,
        resultadoBarrera: 'ABIERTA',
        motivo,
      });
    } catch (error) {
      await this.cupoRepository.releaseSpot(sede.id, tipoVehiculo);
      throw error;
    }

    const cobro = await this.billingGenerator.generateOnEntry({
      sedeId: sede.id,
      eventoIngresoId: evento.id,
      placa,
      tipoVehiculo,
      fechaHora: now,
    });

    return {
      descartado: false,
      resultadoBarrera: 'ABIERTA',
      motivo,
      evento,
      cobro,
    };
  }

  private async confirmManualExit(params: {
    sede: SedeConfig;
    placa: string;
    tipoVehiculo: VehicleType;
    confianzaLectura: number;
    usuarioId: number;
  }): Promise<ValidateManualAccessResult> {
    const { sede, placa, tipoVehiculo, confianzaLectura, usuarioId } = params;
    const now = this.clock.now();
    const operationalDay = calculateOperationalDay(now);

    const cobro =
      await this.cobroConsultaRepository.findByPlateSedeAndOperationalDay(
        placa,
        sede.id,
        operationalDay,
      );

    const exitState = resolveChargeExitState(cobro);
    if (!exitState.permiteSalida()) {
      return {
        descartado: false,
        resultadoBarrera: 'CERRADA',
        motivo: exitState.obtenerMotivo(tipoVehiculo),
        evento: null,
        cobro: null,
      };
    }

    const motivo =
      'Barrera Abierta: Salida confirmada manualmente por el operador (LECTURA_MANUAL)';

    const evento = await this.eventoAccesoRepository.create({
      sedeId: sede.id,
      tipoVehiculo,
      usuarioId,
      placa,
      tipoEvento: 'SALIDA',
      confianzaLectura,
      lecturaManual: true,
      fechaHora: now,
      resultadoBarrera: 'ABIERTA',
      motivo,
    });

    await this.cupoRepository.releaseSpot(sede.id, tipoVehiculo);

    return {
      descartado: false,
      resultadoBarrera: 'ABIERTA',
      motivo,
      evento,
      cobro: null,
    };
  }
}
