import type { ChargeStatus, CobroSummary } from '../access/access.types';

export const COBRO_CONSULTA_REPOSITORY_PORT = Symbol(
  'COBRO_CONSULTA_REPOSITORY_PORT',
);

export interface CobroQueryFilters {
  placa?: string;
  fechaDiaOperativo?: string;
  estado?: ChargeStatus;
}

/**
 * Puerto segregado de solo lectura sobre cobros para validar RN-06 en salida y consultas HU-08 (ISP + DIP).
 */
export interface ICobroConsultaRepository {
  findByPlateSedeAndOperationalDay(
    placa: string,
    sedeId: number,
    operationalDay: string,
  ): Promise<CobroSummary | null>;
  findMany?(filters: CobroQueryFilters): Promise<CobroSummary[]>;
}
