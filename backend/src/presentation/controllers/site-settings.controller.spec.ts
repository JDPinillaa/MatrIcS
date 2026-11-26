import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GetSiteSettingsUseCase } from '../../application/use-cases/settings/get-site-settings.use-case';
import { siteSettingsFixture } from '../../application/use-cases/settings/site-settings.fixture';
import { UpdateCapacitiesUseCase } from '../../application/use-cases/settings/update-capacities.use-case';
import { UpdateTariffsUseCase } from '../../application/use-cases/settings/update-tariffs.use-case';
import { UpdateTimeBandsUseCase } from '../../application/use-cases/settings/update-time-bands.use-case';
import { configureApp } from '../../bootstrap';
import { CLOCK_PORT } from '../../domain/ports/clock.port';
import {
  SITE_SETTINGS_REPOSITORY_PORT,
  type ISiteSettingsRepository,
} from '../../domain/ports/site-settings.repository.port';
import {
  TOKEN_SERVICE_PORT,
  type ITokenService,
} from '../../domain/ports/token-service.port';
import { HmacJwtTokenAdapter } from '../../infrastructure/adapters/hmac-jwt-token.adapter';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { SiteSettingsController } from './site-settings.controller';

describe('SiteSettingsController HTTP Integration (HU-02)', () => {
  let app: INestApplication;
  let repository: jest.Mocked<ISiteSettingsRepository>;
  let adminToken: string;
  let operadorToken: string;

  beforeAll(async () => {
    repository = {
      findBySedeId: jest.fn().mockResolvedValue(siteSettingsFixture),
      updateTariffs: jest.fn().mockResolvedValue(undefined),
      updateTimeBands: jest.fn().mockResolvedValue(undefined),
      updateCapacities: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SiteSettingsController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: 'clave-de-pruebas-con-mas-de-32-caracteres-123456',
          }),
        },
        { provide: CLOCK_PORT, useValue: { now: () => new Date() } },
        { provide: TOKEN_SERVICE_PORT, useClass: HmacJwtTokenAdapter },
        { provide: SITE_SETTINGS_REPOSITORY_PORT, useValue: repository },
        GetSiteSettingsUseCase,
        UpdateTariffsUseCase,
        UpdateTimeBandsUseCase,
        UpdateCapacitiesUseCase,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const tokenService = moduleRef.get<ITokenService>(TOKEN_SERVICE_PORT);
    adminToken = tokenService.sign({
      sub: 1,
      email: 'admin@parqueadero.local',
      rol: 'ADMINISTRADOR',
    });
    operadorToken = tokenService.sign({
      sub: 2,
      email: 'operador@parqueadero.local',
      rol: 'OPERADOR',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /sedes/1/configuracion devuelve tarifas, franjas y cupos', async () => {
    const response = await request(app.getHttpServer())
      .get('/sedes/1/configuracion')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual(siteSettingsFixture);
  });

  it('Caso de Éxito HU-02: PUT /tarifas con 10.000 / 7.000 / moto $0 responde 200 y guarda', async () => {
    const body = {
      carroDiurna: 10000,
      carroNocturna: 7000,
      motoDiurna: 0,
      motoNocturna: 0,
    };

    await request(app.getHttpServer())
      .put('/sedes/1/tarifas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(200);

    expect(repository.updateTariffs).toHaveBeenCalledWith(1, body);
  });

  it('Caso de Error HU-02: PUT /tarifas con nocturna 11.000 y diurna 10.000 responde 400 por RN-02', async () => {
    const response = await request(app.getHttpServer())
      .put('/sedes/1/tarifas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        carroDiurna: 10000,
        carroNocturna: 11000,
        motoDiurna: 0,
        motoNocturna: 0,
      })
      .expect(400);

    expect(response.body.code).toBe('TARIFF_NIGHT_NOT_LOWER');
    expect(response.body.message).toContain('RN-02');
    expect(repository.updateTariffs).not.toHaveBeenCalled();
  });

  it('PUT /cupos con 40 carros y 25 motos responde 200', async () => {
    const body = { capacidadCarros: 40, capacidadMotos: 25 };

    await request(app.getHttpServer())
      .put('/sedes/1/cupos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(200);

    expect(repository.updateCapacities).toHaveBeenCalledWith(1, body);
  });

  it('PUT /cupos rechaza números negativos con 400', async () => {
    await request(app.getHttpServer())
      .put('/sedes/1/cupos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacidadCarros: -5, capacidadMotos: 25 })
      .expect(400);

    expect(repository.updateCapacities).not.toHaveBeenCalled();
  });

  it('PUT /franjas con un hueco entre franjas responde 400', async () => {
    await request(app.getHttpServer())
      .put('/sedes/1/franjas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        diurnaInicio: '06:00',
        diurnaFin: '17:59',
        nocturnaInicio: '19:00',
        nocturnaFin: '05:59',
      })
      .expect(400);

    expect(repository.updateTimeBands).not.toHaveBeenCalled();
  });

  it('el rol OPERADOR recibe 403 y sin token 401', async () => {
    await request(app.getHttpServer())
      .put('/sedes/1/tarifas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ carroDiurna: 4000, carroNocturna: 2500, motoDiurna: 0, motoNocturna: 0 })
      .expect(403);

    await request(app.getHttpServer()).get('/sedes/1/configuracion').expect(401);
  });
});