import { Injectable } from '@nestjs/common';
import type {
  IPlateOcrRecognizer,
  OcrImageInput,
  OcrRecognitionResult,
} from '../../domain/ports/plate-ocr-recognizer.port';

const COLOMBIAN_PLATE_IN_NAME = /([A-Z]{3}[0-9]{2}[0-9A-Z]?)/;

/**
 * Implementación local de respaldo (Plan B) para reconocimiento de imágenes (LSP / HU-09).
 * Si el nombre del archivo incluye una placa colombiana (ej. `ABC123.jpg`), simula una lectura
 * nítida; de lo contrario solicita validación manual sin depender de servicios externos.
 */
@Injectable()
export class SimulatedImageOcrAdapter implements IPlateOcrRecognizer {
  async recognize(image: OcrImageInput): Promise<OcrRecognitionResult> {
    const baseName = image.originalname.replace(/\.[^.]+$/, '').toUpperCase();
    const match = COLOMBIAN_PLATE_IN_NAME.exec(baseName);

    if (match) {
      return {
        placa: match[1],
        confianza: 92,
        origen: 'SIMULADOR',
        requiereValidacionManual: false,
        detalle: 'Lectura generada por el simulador local (Plan B).',
      };
    }

    return {
      placa: null,
      confianza: 0,
      origen: 'SIMULADOR',
      requiereValidacionManual: true,
      detalle:
        'Modo simulador local activo (Plan B): digite o valide la placa manualmente.',
    };
  }
}
