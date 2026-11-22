import { Injectable, Logger } from '@nestjs/common';
import type {
  IPlateOcrRecognizer,
  OcrImageInput,
  OcrRecognitionResult,
} from '../../domain/ports/plate-ocr-recognizer.port';

export interface FastApiOcrConfig {
  serviceUrl: string;
  timeoutMs: number;
  minConfidence: number;
}

export type FetchFn = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

interface FastApiRawResponse {
  placa?: unknown;
  confianza?: unknown;
}

/**
 * Adaptador HTTP hacia el microservicio Python FastAPI + EasyOCR (Patrón Adapter / HU-09).
 * Ante caída de red o timeout, degrada de forma controlada al Plan B local sin tumbar el carril.
 */
@Injectable()
export class FastApiOcrAdapter implements IPlateOcrRecognizer {
  private readonly logger = new Logger(FastApiOcrAdapter.name);

  constructor(
    private readonly config: FastApiOcrConfig,
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init),
  ) {}

  async recognize(image: OcrImageInput): Promise<OcrRecognitionResult> {
    const endpoint = `${this.config.serviceUrl.replace(/\/+$/, '')}/ocr/placa`;
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(image.buffer)], {
      type: image.mimetype,
    });
    formData.append('imagen', blob, image.originalname);

    try {
      const response = await this.fetchFn(endpoint, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        this.logger.warn(
          `El servicio OCR respondió con estado HTTP ${response.status}. Activando fallback Plan B.`,
        );
        return this.buildFallbackResult(
          `El servicio OCR devolvió estado ${response.status}; continúe con validación manual o simulador (Plan B).`,
        );
      }

      const payload = (await response.json()) as FastApiRawResponse;
      const normalizedPlate =
        typeof payload.placa === 'string' && payload.placa.trim().length > 0
          ? payload.placa.trim().toUpperCase()
          : null;

      const rawConfidence = Number(payload.confianza);
      const confianza = Number.isFinite(rawConfidence)
        ? Math.min(100, Math.max(0, rawConfidence))
        : 0;

      const requiereValidacionManual =
        normalizedPlate === null || confianza < this.config.minConfidence;

      let detalle: string | null = null;
      if (normalizedPlate === null) {
        detalle =
          'El motor OCR no detectó una placa legible; requiere validación manual.';
      } else if (requiereValidacionManual) {
        detalle = `Confianza OCR (${confianza}%) por debajo del umbral (${this.config.minConfidence}%); requiere validación manual.`;
      }

      return {
        placa: normalizedPlate,
        confianza,
        origen: 'OCR_FASTAPI',
        requiereValidacionManual,
        detalle,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Error de red desconocido';
      this.logger.warn(
        `No se pudo contactar el servicio OCR (${reason}). Activando fallback Plan B.`,
      );
      return this.buildFallbackResult(
        'Servicio OCR no disponible o excedió el tiempo de espera; operando en respaldo local (Plan B) para validación manual.',
      );
    }
  }

  private buildFallbackResult(detalle: string): OcrRecognitionResult {
    return {
      placa: null,
      confianza: 0,
      origen: 'SIMULADOR',
      requiereValidacionManual: true,
      detalle,
    };
  }
}
