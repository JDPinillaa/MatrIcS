import { Inject, Injectable } from '@nestjs/common';
import type {
  BarrierResult,
  CobroSummary,
  EventoAccesoRecord,
} from '../../../domain/access/access.types';
import { PlateClassifier } from '../../../domain/access/plate-classifier';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import {
  BILLING_GENERATOR_PORT,
  type IBillingGeneratorPort,
} from '../../../domain/ports/billing-generator.port';
import { CLOCK_PORT, type IClock } from '../../../domain/ports/clock.port';
import {
  CUPO_REPOSITORY_PORT,
  type ICupoRepository,
} from '../../../domain/ports/cupo.repository.port';
import {
  EVENTO_ACCESO_REPOSITORY_PORT,
  type IEventoAccesoRepository,
} from '../../../domain/ports/evento-acceso.repository.port';
import {
  LPR_READER_PORT,
  type ILprReader,
} from '../../../domain/ports/lpr-reader.port';
import {
  SEDE_CONFIG_REPOSITORY_PORT,
  type ISedeConfigRepository,
} from '../../../domain/ports/sede-config.repository.port';
import { CapacityReservationHandler } from './handlers/capacity-reservation.handler';
import { ConfidenceThresholdHandler } from './handlers/confidence-threshold.handler';
import type { EntryValidationContext } from './handlers/entry-validation.handler';

export interface RegisterEntryCommand {
  sedeId: number;
  placa: string;
  confianzaLectura: number;
}

export interface RegisterEntryResult {
  requiereValidacionManual: boolean;
  resultadoBarrera: BarrierResult;
  motivo: string;
  evento: EventoAccesoRecord | null;
  cobro: CobroSummary | null;
}

/**
 * Caso de uso HU-03: procesa el ingreso vehicular en el carril de entrada.
 * Orquesta lectura LPR (Adapter/LSP), clasificación (Strategy/OCP), validaciones
 * encadenadas (Chain of Responsibility) y persistencia desacoplada (Repository/DIP).
 */
@Injectable()
export class RegisterEntryUseCase {
  constructor(
    @Inject(LPR_READER_PORT)
    private readonly lprReader: ILprReader,
    @Inject(SEDE_CONFIG_REPOSITORY_PORT)
    private readonly sedeConfigRepository: ISedeConfigRepository,
    @Inject(CUPO_REPOSITORY_PORT)
    private readonly cupoRepository: ICupoRepository,
    @Inject(EVENTO_ACCESO_REPOSITORY_PORT)
    private readonly eventoAccesoRepository: IEventoAccesoRepository,
    @Inject(BILLING_GENERATOR_PORT)
    private readonly billingGenerator: IBillingGeneratorPort,
    @Inject(CLOCK_PORT)
    private readonly clock: IClock,
    private readonly plateClassifier: PlateClassifier = new PlateClassifier(),
  ) {}

  async execute(command: RegisterEntryCommand): Promise<RegisterEntryResult> {
    const reading = await this.lprReader.readPlate({
      placa: command.placa,
      confianzaLectura: command.confianzaLectura,
    });

    const { placa, tipoVehiculo } = this.plateClassifier.classify(reading.placa);

    const sede = await this.sedeConfigRepository.findActiveById(command.sedeId);
    if (!sede) {
      throw new DomainNotFoundException(
        `No se encontró una sede activa con id ${command.sedeId}.`,
        'SITE_NOT_FOUND',
      );
    }

    const validationChain = new ConfidenceThresholdHandler();
    validationChain.setNext(new CapacityReservationHandler(this.cupoRepository));

    const context: EntryValidationContext = {
      sede,
      placa,
      tipoVehiculo,
      confianzaLectura: reading.confianza,
    };

    const blocked = await validationChain.handle(context);
    if (blocked) {
      return {
        requiereValidacionManual: blocked.requiereValidacionManual,
        resultadoBarrera: blocked.resultadoBarrera,
        motivo: blocked.motivo,
        evento: null,
        cobro: null,
      };
    }

    const now = this.clock.now();
    const motivo = 'Barrera Abierta: Ingreso registrado correctamente';

    let evento: EventoAccesoRecord;
    try {
      evento = await this.eventoAccesoRepository.create({
        sedeId: sede.id,
        tipoVehiculo,
        usuarioId: null,
        placa,
        tipoEvento: 'ENTRADA',
        confianzaLectura: reading.confianza,
        lecturaManual: false,
        fechaHora: now,
        resultadoBarrera: 'ABIERTA',
        motivo,
      });
    } catch (error) {
      // Compensación: si falla el registro del evento, se devuelve el cupo reservado.
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
      requiereValidacionManual: false,
      resultadoBarrera: 'ABIERTA',
      motivo,
      evento,
      cobro,
    };
  }
}
