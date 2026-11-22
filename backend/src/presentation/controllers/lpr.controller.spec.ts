import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RecognizePlateUseCase } from '../../application/use-cases/lpr/recognize-plate.use-case';
import { configureApp } from '../../bootstrap';
import {
  PLATE_OCR_RECOGNIZER_PORT,
  type IPlateOcrRecognizer,
} from '../../domain/ports/plate-ocr-recognizer.port';
import { SimulatedImageOcrAdapter } from '../../infrastructure/adapters/simulated-image-ocr.adapter';
import { ROLES_KEY } from '../auth/auth.decorators';
import { LprController } from './lpr.controller';

describe('LprController HTTP Integration (HU-09)', () => {
  let app: INestApplication;
  let recognizer: IPlateOcrRecognizer;

  beforeAll(async () => {
    recognizer = new SimulatedImageOcrAdapter();

    const moduleRef = await Test.createTestingModule({
      controllers: [LprController],
      providers: [
        { provide: PLATE_OCR_RECOGNIZER_PORT, useValue: recognizer },
        RecognizePlateUseCase,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /lpr/reconocer responde 200 OK al adjuntar imagen .jpg válida', async () => {
    const response = await request(app.getHttpServer())
      .post('/lpr/reconocer')
      .attach('imagen', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
        filename: 'carro_ABC123.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      placa: 'ABC123',
      confianza: 92,
      origen: 'SIMULADOR',
      requiereValidacionManual: false,
    });
  });

  it('POST /lpr/reconocer responde 200 con requiereValidacionManual=true ante imagen borrosa sin placa', async () => {
    const response = await request(app.getHttpServer())
      .post('/lpr/reconocer')
      .attach('imagen', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'borrosa.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      placa: null,
      confianza: 0,
      origen: 'SIMULADOR',
      requiereValidacionManual: true,
    });
  });

  it('POST /lpr/reconocer responde 400 JSON controlado cuando falta el archivo', async () => {
    const response = await request(app.getHttpServer())
      .post('/lpr/reconocer')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'IMAGE_REQUIRED',
      path: '/lpr/reconocer',
    });
  });

  it('POST /lpr/reconocer responde 400 JSON controlado ante archivo no imagen (.txt)', async () => {
    const response = await request(app.getHttpServer())
      .post('/lpr/reconocer')
      .attach('imagen', Buffer.from('no es una imagen'), {
        filename: 'notas.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'INVALID_IMAGE_FORMAT',
      path: '/lpr/reconocer',
    });
  });

  it('LprController exige rol OPERADOR alineado con HU-01', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, LprController);
    expect(roles).toEqual(['OPERADOR']);
  });
});
