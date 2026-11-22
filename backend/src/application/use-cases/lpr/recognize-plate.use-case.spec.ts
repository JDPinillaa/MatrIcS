import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import type {
  IPlateOcrRecognizer,
  OcrImageInput,
  OcrRecognitionResult,
} from '../../../domain/ports/plate-ocr-recognizer.port';
import { RecognizePlateUseCase } from './recognize-plate.use-case';

describe('RecognizePlateUseCase (HU-09)', () => {
  const validJpg: OcrImageInput = {
    originalname: 'placa_ABC123.jpg',
    mimetype: 'image/jpeg',
    size: 2048,
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  };

  function buildUseCase() {
    const recognizer: jest.Mocked<IPlateOcrRecognizer> = {
      recognize: jest.fn(),
    };
    return { useCase: new RecognizePlateUseCase(recognizer), recognizer };
  }

  it('delega imágenes .jpg/.png válidas al adaptador OCR configurado', async () => {
    const { useCase, recognizer } = buildUseCase();
    const expected: OcrRecognitionResult = {
      placa: 'ABC123',
      confianza: 94.2,
      origen: 'OCR_FASTAPI',
      requiereValidacionManual: false,
      detalle: null,
    };
    recognizer.recognize.mockResolvedValue(expected);

    const result = await useCase.execute(validJpg);

    expect(result).toEqual(expected);
    expect(recognizer.recognize).toHaveBeenCalledWith(validJpg);
  });

  it('rechaza peticiones sin archivo adjunto (IMAGE_REQUIRED)', async () => {
    const { useCase, recognizer } = buildUseCase();

    await expect(useCase.execute(undefined)).rejects.toThrow(
      BusinessValidationException,
    );
    expect(recognizer.recognize).not.toHaveBeenCalled();
  });

  it('rechaza formatos distintos a .jpg/.png (INVALID_IMAGE_FORMAT)', async () => {
    const { useCase, recognizer } = buildUseCase();

    await expect(
      useCase.execute({
        originalname: 'documento.pdf',
        mimetype: 'application/pdf',
        size: 1000,
        buffer: Buffer.from('%PDF-1.4'),
      }),
    ).rejects.toThrow(BusinessValidationException);
    expect(recognizer.recognize).not.toHaveBeenCalled();
  });

  it('rechaza imágenes que superan 5 MB (IMAGE_TOO_LARGE)', async () => {
    const { useCase, recognizer } = buildUseCase();

    await expect(
      useCase.execute({
        ...validJpg,
        size: 6 * 1024 * 1024,
      }),
    ).rejects.toThrow(BusinessValidationException);
    expect(recognizer.recognize).not.toHaveBeenCalled();
  });
});
