export const PLATE_OCR_RECOGNIZER_PORT = Symbol('PLATE_OCR_RECOGNIZER_PORT');

export type OcrOrigin = 'OCR_FASTAPI' | 'SIMULADOR';

export interface OcrImageInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface OcrRecognitionResult {
  placa: string | null;
  confianza: number;
  origen: OcrOrigin;
  requiereValidacionManual: boolean;
  detalle: string | null;
}

/**
 * Puerto para extracción automática de placa desde imágenes (HU-09).
 * Permite sustituir el motor OCR real (FastAPI) por el simulador local (Plan B)
 * cumpliendo Sustitución de Liskov (LSP) e Inversión de Dependencias (DIP).
 */
export interface IPlateOcrRecognizer {
  recognize(image: OcrImageInput): Promise<OcrRecognitionResult>;
}
