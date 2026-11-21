import { Inject, Injectable } from '@nestjs/common';
import type {
  BarrierResult,
  EventoAccesoRecord,
} from '../../../domain/access/access.types';
import { resolveChargeExitState } from '../../../domain/access/charge-exit-state';
import { calculateOperationalDay } from '../../../domain/access/operational-day.calculator';
import { PlateClassifier } from '../../../domain/access/plate-classifier';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
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
  LPR_READER_PORT,
  type ILprReader,
} from '../../../domain/ports/lpr-reader.port';
import {
  SEDE_CONFIG_REPOSITORY_PORT,
  type ISedeConfigRepository,
} from '../../../domain/ports/sede-config.repository.port';

export interface RegisterExitCommand {
  sedeId: number;
  placa: string;
  confianzaLectura: number;
}

export interface RegisterExitResult {
  requiereValidacionManual: boolean;
  resultadoBarrera: BarrierResult;
  motivo: string;
  evento: EventoAccesoRecord | null;
}

/**
 * Caso de uso HU-07: valida la salida vehicular contra el estado del cobro del día
 * operativo (RN-06 + Patrón State), registra la salida y libera 1 cupo atómicamente.
 */
@Injectable()
export class RegisterExitUseCase {
  constructor(
    @Inject(LPR_READER_PORT)
    private readonly lprReader: ILprReader,
    @Inject(SEDE_CONFIG_REPOSITORY_PORT)
    private readonly sedeConfigRepository: ISedeConfigRepository,
    @Inject(COBRO_CONSULTA_REPOSITORY_PORT)
    private readonly cobroConsultaRepository: ICobroConsultaRepository,
    @Inject(CUPO_REPOSITORY_PORT)
    private readonly cupoRepository: ICupoRepository,
    @Inject(EVENTO_ACCESO_REPOSITORY_PORT)
    private readonly eventoAccesoRepository: IEventoAccesoRepository,
    @Inject(CLOCK_PORT)
    private readonly clock: IClock,
    private readonly plateClassifier: PlateClassifier = new PlateClassifier(),
  ) {}

  async execute(command: RegisterExitCommand): Promise<RegisterExitResult> {
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

    if (reading.confianza < sede.umbralConfianza) {
      return {
        requiereValidacionManual: true,
        resultadoBarrera: 'CERRADA',
        motivo: `Confianza de lectura (${reading.confianza}%) inferior al umbral configurado (${sede.umbralConfianza}%). Requiere validación manual del operador.`,
        evento: null,
      };
    }

    const now = this.clock.now();
    const operationalDay = calculateOperationalDay(now);

    const cobro =
      await this.cobroConsultaRepository.findByPlateSedeAndOperationalDay(
        placa,
        sede.id,
        operationalDay,
      );

    const exitState = resolveChargeExitState(cobro);
    const motivo = exitState.obtenerMotivo(tipoVehiculo);

    if (!exitState.permiteSalida()) {
      return {
        requiereValidacionManual: false,
        resultadoBarrera: 'CERRADA',
        motivo,
        evento: null,
      };
    }

    const evento = await this.eventoAccesoRepository.create({
      sedeId: sede.id,
      tipoVehiculo,
      usuarioId: null,
      placa,
      tipoEvento: 'SALIDA',
      confianzaLectura: reading.confianza,
      lecturaManual: false,
      fechaHora: now,
      resultadoBarrera: 'ABIERTA',
      motivo,
    });

    await this.cupoRepository.releaseSpot(sede.id, tipoVehiculo);

    return {
      requiereValidacionManual: false,
      resultadoBarrera: 'ABIERTA',
      motivo,
      evento,
    };
  }
}
