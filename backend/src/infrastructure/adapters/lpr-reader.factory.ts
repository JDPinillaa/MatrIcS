import type { ConfigService } from '@nestjs/config';
import type { IPlateOcrRecognizer } from '../../domain/ports/plate-ocr-recognizer.port';
import { FastApiOcrAdapter } from './fast-api-ocr.adapter';
import { SimulatedImageOcrAdapter } from './simulated-image-ocr.adapter';

export type LprMode = 'simulator' | 'ocr';

/**
 * Patrón Factory (HU-09 criterio d): instancia dinámicamente el adaptador OCR real
 * o el simulador local (Plan B) a partir de la variable de entorno `LPR_MODE`.
 */
export class LprReaderFactory {
  static resolveMode(configService: ConfigService): LprMode {
    const raw = (configService.get<string>('LPR_MODE', 'simulator') ?? '')
      .trim()
      .toLowerCase();
    return raw === 'ocr' ? 'ocr' : 'simulator';
  }

  static createImageRecognizer(
    configService: ConfigService,
  ): IPlateOcrRecognizer {
    const mode = LprReaderFactory.resolveMode(configService);

    if (mode === 'ocr') {
      const serviceUrl =
        configService.get<string>('OCR_SERVICE_URL', 'http://localhost:8000') ??
        'http://localhost:8000';
      const parsedTimeout = Number(
        configService.get<string>('OCR_TIMEOUT_MS', '5000'),
      );
      const parsedConfidence = Number(
        configService.get<string>('OCR_MIN_CONFIDENCE', '80'),
      );

      return new FastApiOcrAdapter({
        serviceUrl,
        timeoutMs:
          Number.isFinite(parsedTimeout) && parsedTimeout > 0
            ? parsedTimeout
            : 5000,
        minConfidence:
          Number.isFinite(parsedConfidence) &&
          parsedConfidence >= 0 &&
          parsedConfidence <= 100
            ? parsedConfidence
            : 80,
      });
    }

    return new SimulatedImageOcrAdapter();
  }
}
