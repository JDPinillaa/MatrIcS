import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CheckHealthUseCase } from '../../application/use-cases/health/check-health.use-case';
import { configureApp } from '../../bootstrap';
import { BusinessValidationException } from '../../domain/exceptions/business-validation.exception';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../domain/ports/database-connection.port';
import { HealthController } from './health.controller';

@Controller('test-errors')
class TestErrorController {
  @Get('business')
  throwBusinessError(): void {
    throw new BusinessValidationException(
      'No hay cupos disponibles para CARRO',
      'NO_CAPACITY',
    );
  }
}

describe('HealthController & HTTP Integration', () => {
  let app: INestApplication;

  const mockDbConnection: IDatabaseConnection = {
    query: jest.fn(),
    checkConnection: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, TestErrorController],
      providers: [
        CheckHealthUseCase,
        {
          provide: DATABASE_CONNECTION_PORT,
          useValue: mockDbConnection,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde 200 OK con el estado del servidor', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'matrics-backend',
      database: 'connected',
    });
  });

  it('intercepta BusinessValidationException y responde HTTP 400 sin stack trace', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-errors/business')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'NO_CAPACITY',
      message: 'No hay cupos disponibles para CARRO',
      path: '/test-errors/business',
    });
    expect(response.body).not.toHaveProperty('stack');
  });

  it('GET /api/docs/ responde 200 OK con la interfaz interactiva de Swagger UI', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs/')
      .expect(200);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('swagger-ui');
    expect(response.text).toContain('MatrIcS API Docs');
  });

  it('GET /api/docs-json responde 200 OK con la especificación OpenAPI alineada', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths).toHaveProperty('/health');
    expect(response.body.paths).toHaveProperty('/sedes/{sedeId}/umbral-confianza');
    expect(response.body.paths).toHaveProperty('/lpr/reconocer');
  });
});
