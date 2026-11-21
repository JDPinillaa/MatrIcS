import { Inject, Injectable } from '@nestjs/common';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import {
  PLATE_OCR_RECOGNIZER_PORT,
  type IPlateOcrRecognizer,
  type OcrImageInput,
  type OcrRecognitionResult,
} from '../../../domain/ports/plate-ocr-recognizer.port';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png)$/i;

/**
 * Caso de uso HU-09: valida la imagen recibida (.jpg/.png) y delega la extracción
 * de placa y nivel de confianza al adaptador IPlateOcrRecognizer configurado.
 */
@Injectable()
export class RecognizePlateUseCase {
  constructor(
    @Inject(PLATE_OCR_RECOGNIZER_PORT)
    private readonly ocrRecognizer: IPlateOcrRecognizer,
  ) {}

  async execute(image: OcrImageInput | undefined): Promise<OcrRecognitionResult> {
    if (!image || !image.buffer || image.size <= 0) {
      throw new BusinessValidationException(
        'Debe adjuntar una imagen válida en el campo "imagen" (.jpg o .png).',
        'IMAGE_REQUIRED',
      );
    }

    if (image.size > MAX_IMAGE_BYTES) {
      throw new BusinessValidationException(
        'La imagen supera el tamaño máximo permitido de 5 MB.',
        'IMAGE_TOO_LARGE',
      );
    }

    const mimeValid = ALLOWED_MIME_TYPES.has(image.mimetype.toLowerCase());
    const extValid = ALLOWED_EXTENSIONS.test(image.originalname);

    if (!mimeValid || !extValid) {
      throw new BusinessValidationException(
        'Formato de imagen no soportado. Solo se permiten archivos .jpg o .png.',
        'INVALID_IMAGE_FORMAT',
      );
    }

    return this.ocrRecognizer.recognize(image);
  }
}
