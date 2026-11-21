import type { CobroSummary, VehicleType } from '../access/access.types';

export const BILLING_GENERATOR_PORT = Symbol('BILLING_GENERATOR_PORT');

export interface GenerateBillingInput {
  sedeId: number;
  eventoIngresoId: number;
  placa: string;
  tipoVehiculo: VehicleType;
  fechaHora: Date;
}

/**
 * Puerto desacoplado para conectar el motor de generación de cobros (HU-05)
 * al flujo de ingreso (HU-03) sin acoplar ambos módulos (DIP).
 */
export interface IBillingGeneratorPort {
  generateOnEntry(input: GenerateBillingInput): Promise<CobroSummary | null>;
}
