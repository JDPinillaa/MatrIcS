import type { ChargeStatus, VehicleType } from '../access/access.types';

/**
 * Tarifa vigente de una franja horaria para un tipo de vehículo en una sede.
 * `horaInicio` y `horaFin` llegan en formato `HH:MM` o `HH:MM:SS` (tipo TIME de PostgreSQL).
 */
export interface TarifaFranja {
  franja: string;
  horaInicio: string;
  horaFin: string;
  valor: number;
}

/**
 * Datos para crear un cobro. Guarda una copia de la franja y del valor
 * con los que se liquidó (RN-07: tarifa histórica).
 */
export interface CreateCobroInput {
  sedeId: number;
  eventoIngresoId: number;
  placa: string;
  tipoVehiculo: VehicleType;
  fechaDiaOperativo: string;
  franjaAplicada: string;
  valorAplicado: number;
  estado: Extract<ChargeStatus, 'PENDIENTE' | 'EXENTO'>;
  generadoEn: Date;
}
