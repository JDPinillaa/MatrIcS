import type { CobroSummary } from '../access/access.types';
import type { CreateCobroInput } from '../billing/billing.types';

export const COBRO_REPOSITORY_PORT = Symbol('COBRO_REPOSITORY_PORT');

/**
 * Puerto de escritura de cobros (HU-05).
 * Si ya existe un cobro para (placa, sede, día operativo), la base de datos rechaza la inserción
 * (restricción `uq_cobros_placa_sede_dia`) y el adaptador lanza DomainConflictException
 * con código `DUPLICATE_DAILY_CHARGE`.
 */
export interface ICobroRepository {
  create(input: CreateCobroInput): Promise<CobroSummary>;
}
