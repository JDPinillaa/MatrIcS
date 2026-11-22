import { Inject, Injectable } from '@nestjs/common';
import type {
  ChargeStatus,
  CobroSummary,
} from '../../../domain/access/access.types';
import {
  COBRO_CONSULTA_REPOSITORY_PORT,
  type ICobroConsultaRepository,
} from '../../../domain/ports/cobro-consulta.repository.port';

export interface ListChargesQuery {
  placa?: string;
  fechaDiaOperativo?: string;
  estado?: ChargeStatus;
}

/**
 * Caso de uso HU-08: lista los cobros generados conservando su tarifa histórica (RN-07),
 * con filtrado por placa (total o parcial), fecha de día operativo y estado del cobro.
 */
@Injectable()
export class ListChargesUseCase {
  constructor(
    @Inject(COBRO_CONSULTA_REPOSITORY_PORT)
    private readonly cobroConsultaRepository: ICobroConsultaRepository,
  ) {}

  async execute(query: ListChargesQuery = {}): Promise<CobroSummary[]> {
    if (!this.cobroConsultaRepository.findMany) {
      return [];
    }

    const normalizedPlaca = query.placa?.trim().toUpperCase();

    return this.cobroConsultaRepository.findMany({
      placa: normalizedPlaca && normalizedPlaca.length > 0 ? normalizedPlaca : undefined,
      fechaDiaOperativo: query.fechaDiaOperativo?.trim() || undefined,
      estado: query.estado,
    });
  }
}
