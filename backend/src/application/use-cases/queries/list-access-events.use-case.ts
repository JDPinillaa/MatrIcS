import { Inject, Injectable } from '@nestjs/common';
import type {
  AccessEventType,
  EventoAccesoRecord,
} from '../../../domain/access/access.types';
import {
  EVENTO_ACCESO_REPOSITORY_PORT,
  type IEventoAccesoRepository,
} from '../../../domain/ports/evento-acceso.repository.port';

export interface ListAccessEventsQuery {
  placa?: string;
  fecha?: string;
  tipoEvento?: AccessEventType;
  lecturaManual?: boolean;
}

/**
 * Caso de uso HU-08: lista el historial de eventos de acceso (ingresos y salidas)
 * con filtrado por placa (total o parcial), fecha, tipo de movimiento y modo de captura.
 */
@Injectable()
export class ListAccessEventsUseCase {
  constructor(
    @Inject(EVENTO_ACCESO_REPOSITORY_PORT)
    private readonly eventoAccesoRepository: IEventoAccesoRepository,
  ) {}

  async execute(
    query: ListAccessEventsQuery = {},
  ): Promise<EventoAccesoRecord[]> {
    if (!this.eventoAccesoRepository.findMany) {
      return [];
    }

    const normalizedPlaca = query.placa?.trim().toUpperCase();

    return this.eventoAccesoRepository.findMany({
      placa: normalizedPlaca && normalizedPlaca.length > 0 ? normalizedPlaca : undefined,
      fecha: query.fecha?.trim() || undefined,
      tipoEvento: query.tipoEvento,
      lecturaManual: query.lecturaManual,
    });
  }
}
