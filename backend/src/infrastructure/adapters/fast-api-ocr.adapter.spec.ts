import type { ConfigService } from '@nestjs/config';
import type { OcrImageInput } from '../../domain/ports/plate-ocr-recognizer.port';
import { FastApiOcrAdapter, type FetchFn } from './fast-api-ocr.adapter';
import { LprReaderFactory } from './lpr-reader.factory';
import { SimulatedImageOcrAdapter } from './simulated-image-ocr.adapter';

describe('FastApiOcrAdapter, SimulatedImageOcrAdapter & LprReaderFactory (HU-09)', () => {
  const sampleImage: OcrImageInput = {
    originalname: 'vehiculo.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  };

  it('extrae placa normalizada y confianza alta desde el microservicio FastAPI', async () => {
    const mockFetch: FetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ placa: ' abc123 ', confianza: 91.4 }),
    } as unknown as Response);

    const adapter = new FastApiOcrAdapter(
      { serviceUrl: 'http://ocr-local:8000/', timeoutMs: 3000, minConfidence: 80 },
      mockFetch,
    );

    const result = await adapter.recognize(sampleImage);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://ocr-local:8000/ocr/placa',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual({
      placa: 'ABC123',
      confianza: 91.4,
      origen: 'OCR_FASTAPI',
      requiereValidacionManual: false,
      detalle: null,
    });
  });

  it('marca requiereValidacionManual cuando el OCR devuelve baja confianza o imagen borrosa', async () => {
    const mockFetch: FetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ placa: 'MNP789', confianza: 62 }),
    } as unknown as Response);

    const adapter = new FastApiOcrAdapter(
      { serviceUrl: 'http://ocr-local:8000', timeoutMs: 3000, minConfidence: 80 },
      mockFetch,
    );

    const result = await adapter.recognize(sampleImage);

    expect(result.placa).toBe('MNP789');
    expect(result.confianza).toBe(62);
    expect(result.origen).toBe('OCR_FASTAPI');
    expect(result.requiereValidacionManual).toBe(true);
    expect(result.detalle).toContain('62%');
  });

  it('degrada de forma controlada al Plan B local cuando el servicio OCR está apagado o hace timeout', async () => {
    const mockFetch: FetchFn = jest
      .fn()
      .mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

    const adapter = new FastApiOcrAdapter(
      { serviceUrl: 'http://ocr-local:8000', timeoutMs: 1000, minConfidence: 80 },
      mockFetch,
    );
    const warnSpy = jest
      .spyOn(
        (adapter as unknown as { logger: { warn: jest.Mock } }).logger,
        'warn',
      )
      .mockImplementation();

    const result = await adapter.recognize(sampleImage);

    expect(result).toMatchObject({
      placa: null,
      confianza: 0,
      origen: 'SIMULADOR',
      requiereValidacionManual: true,
    });
    expect(result.detalle).toContain('Plan B');
    warnSpy.mockRestore();
  });

  it('SimulatedImageOcrAdapter extrae placa sugerida del nombre de archivo o pide validación manual (LSP)', async () => {
    const simulator = new SimulatedImageOcrAdapter();

    const withPlate = await simulator.recognize({
      ...sampleImage,
      originalname: 'foto_ABC123.jpg',
    });
    expect(withPlate).toMatchObject({
      placa: 'ABC123',
      confianza: 92,
      origen: 'SIMULADOR',
      requiereValidacionManual: false,
    });

    const withoutPlate = await simulator.recognize({
      ...sampleImage,
      originalname: 'captura_borrosa.png',
    });
    expect(withoutPlate).toMatchObject({
      placa: null,
      confianza: 0,
      origen: 'SIMULADOR',
      requiereValidacionManual: true,
    });
  });

  it('LprReaderFactory selecciona SimulatedImageOcrAdapter por defecto y FastApiOcrAdapter con LPR_MODE=ocr', () => {
    const makeConfig = (values: Record<string, string | undefined>) =>
      ({
        get: (key: string, fallback?: string) => values[key] ?? fallback,
      }) as unknown as ConfigService;

    expect(
      LprReaderFactory.createImageRecognizer(makeConfig({})),
    ).toBeInstanceOf(SimulatedImageOcrAdapter);

    expect(
      LprReaderFactory.createImageRecognizer(
        makeConfig({ LPR_MODE: 'ocr', OCR_SERVICE_URL: 'http://localhost:8000' }),
      ),
    ).toBeInstanceOf(FastApiOcrAdapter);
  });
});
