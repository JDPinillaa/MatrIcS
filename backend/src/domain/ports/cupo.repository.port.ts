import type { CupoSnapshot, VehicleType } from '../access/access.types';

export const CUPO_REPOSITORY_PORT = Symbol('CUPO_REPOSITORY_PORT');

/**
 * Puerto segregado para gestionar aforo y cupos de manera atómica por sede y tipo de vehículo (ISP + DIP).
 */
export interface ICupoRepository {
  findBySedeAndVehicleType(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<CupoSnapshot | null>;

  /**
   * Incrementa atómicamente `ocupados` en 1 solo si `ocupados < capacidad_maxima`.
   * Retorna el nuevo estado del cupo o `null` si el parqueadero está lleno.
   */
  reserveSpot(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<CupoSnapshot | null>;

  /**
   * Libera atómicamente 1 cupo (`ocupados - 1`) solo si `ocupados > 0`.
   */
  releaseSpot(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<CupoSnapshot | null>;
}
