import type { PlateReading } from '../access/access.types';

export const LPR_READER_PORT = Symbol('LPR_READER_PORT');

export interface LprRawInput {
  placa: string;
  confianzaLectura: number;
}

/**
 * Puerto de lectura de placas (Patrón Adapter + Principios LSP y DIP).
 * Permite intercambiar simulador, lectura manual o OCR real sin modificar el flujo del carril.
 */
export interface ILprReader {
  readPlate(input: LprRawInput): Promise<PlateReading>;
}
