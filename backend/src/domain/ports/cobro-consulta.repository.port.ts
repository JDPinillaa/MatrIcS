import type { CobroSummary } from '../access/access.types';

export const COBRO_CONSULTA_REPOSITORY_PORT = Symbol(
  'COBRO_CONSULTA_REPOSITORY_PORT',
);

/**
 * Puerto segregado de solo lectura sobre cobros para validar RN-06 en salida (ISP + DIP).
 */
export interface ICobroConsultaRepository {
  findByPlateSedeAndOperationalDay(
    placa: string,
    sedeId: number,
    operationalDay: string,
  ): Promise<CobroSummary | null>;
}
