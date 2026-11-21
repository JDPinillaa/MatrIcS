import { Injectable } from '@nestjs/common';
import type { PlateReading } from '../../domain/access/access.types';
import type {
  ILprReader,
  LprRawInput,
} from '../../domain/ports/lpr-reader.port';

/**
 * Adaptador simulado de lectura LPR (Patrón Adapter / Principio LSP).
 * Intercambiable por el adaptador OCR FastAPI (HU-09) o digitación manual sin cambiar el caso de uso.
 */
@Injectable()
export class SimulatedLprAdapter implements ILprReader {
  async readPlate(input: LprRawInput): Promise<PlateReading> {
    return {
      placa: input.placa.trim().toUpperCase(),
      confianza: input.confianzaLectura,
    };
  }
}
