import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ListAccessEventsUseCase } from '../../application/use-cases/queries/list-access-events.use-case';
import { ListChargesUseCase } from '../../application/use-cases/queries/list-charges.use-case';
import { configureApp } from '../../bootstrap';
import type {
  CobroSummary,
  EventoAccesoRecord,
} from '../../domain/access/access.types';
import { CLOCK_PORT } from '../../domain/ports/clock.port';
import {
  COBRO_CONSULTA_REPOSITORY_PORT,
  type ICobroConsultaRepository,
} from '../../domain/ports/cobro-consulta.repository.port';
import {
  EVENTO_ACCESO_REPOSITORY_PORT,
  type IEventoAccesoRepository,
} from '../../domain/ports/evento-acceso.repository.port';
import {
  TOKEN_SERVICE_PORT,
  type ITokenService,
} from '../../domain/ports/token-service.port';
import { HmacJwtTokenAdapter } from '../../infrastructure/adapters/hmac-jwt-token.adapter';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { QueriesController } from './queries.controller';

describe('QueriesController HTTP Integration (HU-08)', () => {
  let app: INestApplication;
  let eventoRepo: jest.Mocked<IEventoAccesoRepository>;
  let cobroConsultaRepo: jest.Mocked<ICobroConsultaRepository>;
  let tokenService: ITokenService;
  let operadorToken: string;
  let adminToken: string;

  const fixedNow = new Date('2026-11-21T15:00:00.000Z');

  beforeAll(async () => {
    eventoRepo = {
      create: jest.fn(),
      findMany: jest.fn(),
    };
    cobroConsultaRepo = {
      findByPlateSedeAndOperationalDay: jest.fn(),
      findMany: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [QueriesController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: 'clave-de-pruebas-con-mas-de-32-caracteres-123456',
          }),
        },
        { provide: CLOCK_PORT, useValue: { now: () => fixedNow } },
        { provide: TOKEN_SERVICE_PORT, useClass: HmacJwtTokenAdapter },
        { provide: EVENTO_ACCESO_REPOSITORY_PORT, useValue: eventoRepo },
        {
          provide: COBRO_CONSULTA_REPOSITORY_PORT,
          useValue: cobroConsultaRepo,
        },
        ListAccessEventsUseCase,
        ListChargesUseCase,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    tokenService = moduleRef.get<ITokenService>(TOKEN_SERVICE_PORT);
    operadorToken = tokenService.sign({
      sub: 2,
      email: 'operador@parqueadero.local',
      rol: 'OPERADOR',
    });
    adminToken = tokenService.sign({
      sub: 1,
      email: 'admin@parqueadero.local',
      rol: 'ADMINISTRADOR',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Caso de Éxito HU-08: GET /cobros con estado=PENDIENTE y fechaDiaOperativo actual retorna solo cobros pendientes con tarifa histórica (RN-07)', async () => {
    const pendingCharges: CobroSummary[] = [
      {
        id: 55,
        sedeId: 1,
        placa: 'ABC123',
        tipoVehiculo: 'CARRO',
        fechaDiaOperativo: '2026-11-21',
        franjaAplicada: 'DIURNA',
        valorAplicado: 4000,
        estado: 'PENDIENTE',
        generadoEn: '2026-11-21T13:10:00.000Z',
        pagadoEn: null,
      },
    ];
    (cobroConsultaRepo.findMany as jest.Mock).mockResolvedValue(pendingCharges);

    const response = await request(app.getHttpServer())
      .get('/cobros')
      .query({ fechaDiaOperativo: '2026-11-21', estado: 'PENDIENTE' })
      .set('Authorization', `Bearer ${operadorToken}`)
      .expect(200);

    expect(response.body).toEqual(pendingCharges);
    expect(cobroConsultaRepo.findMany).toHaveBeenCalledWith({
      placa: undefined,
      fechaDiaOperativo: '2026-11-21',
      estado: 'PENDIENTE',
    });
  });

  it('Caso Sin Resultados HU-08: GET /eventos y GET /cobros con placa inexistente retornan arreglo vacío 200 OK sin error', async () => {
    (eventoRepo.findMany as jest.Mock).mockResolvedValue([]);
    (cobroConsultaRepo.findMany as jest.Mock).mockResolvedValue([]);

    const eventosRes = await request(app.getHttpServer())
      .get('/eventos')
      .query({ placa: 'ZZZ999' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(eventosRes.body).toEqual([]);
    expect(eventoRepo.findMany).toHaveBeenCalledWith({
      placa: 'ZZZ999',
      fecha: undefined,
      tipoEvento: undefined,
      lecturaManual: undefined,
    });

    const cobrosRes = await request(app.getHttpServer())
      .get('/cobros')
      .query({ placa: 'ZZZ999' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(cobrosRes.body).toEqual([]);
  });

  it('GET /eventos permite filtrar por placa parcial, fecha, tipoEvento y lecturaManual', async () => {
    const manualEvents: EventoAccesoRecord[] = [
      {
        id: 105,
        sedeId: 1,
        tipoVehiculo: 'CARRO',
        usuarioId: 2,
        placa: 'MNP789',
        tipoEvento: 'ENTRADA',
        confianzaLectura: 60,
        lecturaManual: true,
        fechaHora: '2026-11-21T14:35:00.000Z',
        resultadoBarrera: 'ABIERTA',
        motivo:
          'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)',
      },
    ];
    (eventoRepo.findMany as jest.Mock).mockResolvedValue(manualEvents);

    const response = await request(app.getHttpServer())
      .get('/eventos')
      .query({
        placa: 'mnp',
        fecha: '2026-11-21',
        tipoEvento: 'ENTRADA',
        lecturaManual: 'true',
      })
      .set('Authorization', `Bearer ${operadorToken}`)
      .expect(200);

    expect(response.body).toEqual(manualEvents);
    expect(eventoRepo.findMany).toHaveBeenCalledWith({
      placa: 'MNP',
      fecha: '2026-11-21',
      tipoEvento: 'ENTRADA',
      lecturaManual: true,
    });
  });

  it('rechaza peticiones sin token con HTTP 401', async () => {
    await request(app.getHttpServer()).get('/eventos').expect(401);
    await request(app.getHttpServer()).get('/cobros').expect(401);
  });
});
