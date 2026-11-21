import type { VehicleType } from '../access/access.types';
import type { TarifaFranja } from '../billing/billing.types';

export const TARIFA_REPOSITORY_PORT = Symbol('TARIFA_REPOSITORY_PORT');

/**
 * Puerto segregado de lectura de tarifas vigentes por franja (ISP + DIP).
 */
export interface ITarifaRepository {
  findBySedeAndVehicleType(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<TarifaFranja[]>;
}
