import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RegisterEntryUseCase } from '../../application/use-cases/access/register-entry.use-case';
import { configureApp } from '../../bootstrap';
import type { EventoAccesoRecord } from '../../domain/access/access.types';
import { PlateClassifier } from '../../domain/access/plate-classifier';
import { BILLING_GENERATOR_PORT } from '../../domain/ports/billing-generator.port';
import { CLOCK_PORT } from '../../domain/ports/clock.port';
import {
  CUPO_REPOSITORY_PORT,
  type ICupoRepository,
} from '../../domain/ports/cupo.repository.port';
import {
  EVENTO_ACCESO_REPOSITORY_PORT,
  type IEventoAccesoRepository,
} from '../../domain/ports/evento-acceso.repository.port';
import { LPR_READER_PORT } from '../../domain/ports/lpr-reader.port';
import {
  SEDE_CONFIG_REPOSITORY_PORT,
  type ISedeConfigRepository,
} from '../../domain/ports/sede-config.repository.port';
import { NoopBillingGeneratorAdapter } from '../../infrastructure/adapters/noop-billing-generator.adapter';
import { SimulatedLprAdapter } from '../../infrastructure/adapters/simulated-lpr.adapter';
import { AccessController } from './access.controller';

describe('AccessController HTTP Integration (HU-03)', () => {
  let app: INestApplication;
  let sedeRepo: jest.Mocked<ISedeConfigRepository>;
  let cupoRepo: jest.Mocked<ICupoRepository>;
  let eventoRepo: jest.Mocked<IEventoAccesoRepository>;

  const fixedNow = new Date('2026-11-21T15:00:00.000Z');

  beforeAll(async () => {
    sedeRepo = {
      findActiveById: jest.fn(),
    };
    cupoRepo = {
      findBySedeAndVehicleType: jest.fn(),
      reserveSpot: jest.fn(),
      releaseSpot: jest.fn(),
    };
    eventoRepo = {
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AccessController],
      providers: [
        { provide: PlateClassifier, useFactory: () => new PlateClassifier() },
        { provide: LPR_READER_PORT, useClass: SimulatedLprAdapter },
        { provide: CLOCK_PORT, useValue: { now: () => fixedNow } },
        { provide: BILLING_GENERATOR_PORT, useClass: NoopBillingGeneratorAdapter },
        { provide: SEDE_CONFIG_REPOSITORY_PORT, useValue: sedeRepo },
        { provide: CUPO_REPOSITORY_PORT, useValue: cupoRepo },
        { provide: EVENTO_ACCESO_REPOSITORY_PORT, useValue: eventoRepo },
        RegisterEntryUseCase,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sedeRepo.findActiveById.mockResolvedValue({
      id: 1,
      nombre: 'Sede Principal',
      umbralConfianza: 80,
      activa: true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /accesos/ingreso responde 201 ABIERTA al ingresar un carro válido con cupo', async () => {
    const savedEvent: EventoAccesoRecord = {
      id: 10,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: null,
      placa: 'ABC123',
      tipoEvento: 'ENTRADA',
      confianzaLectura: 92,
      lecturaManual: false,
      fechaHora: fixedNow.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Ingreso registrado correctamente',
    };

    cupoRepo.findBySedeAndVehicleType.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 12,
    });
    cupoRepo.reserveSpot.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 13,
    });
    eventoRepo.create.mockResolvedValue(savedEvent);

    const response = await request(app.getHttpServer())
      .post('/accesos/ingreso')
      .send({ sedeId: 1, placa: 'abc123', confianzaLectura: 92 })
      .expect(201);

    expect(response.body).toMatchObject({
      requiereValidacionManual: false,
      resultadoBarrera: 'ABIERTA',
      evento: { placa: 'ABC123', tipoVehiculo: 'CARRO', tipoEvento: 'ENTRADA' },
      cobro: null,
    });
  });

  it('POST /accesos/ingreso responde 201 LLENO cuando los cupos están agotados', async () => {
    cupoRepo.findBySedeAndVehicleType.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 50,
    });

    const response = await request(app.getHttpServer())
      .post('/accesos/ingreso')
      .send({ sedeId: 1, placa: 'ABC123', confianzaLectura: 95 })
      .expect(201);

    expect(response.body).toMatchObject({
      requiereValidacionManual: false,
      resultadoBarrera: 'LLENO',
      evento: null,
    });
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('POST /accesos/ingreso responde 400 JSON controlado ante formato de placa inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/accesos/ingreso')
      .send({ sedeId: 1, placa: 'INVALIDA', confianzaLectura: 95 })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'INVALID_PLATE_FORMAT',
      path: '/accesos/ingreso',
    });
  });

  it('POST /accesos/ingreso responde 400 cuando confianzaLectura supera 100 (ValidationPipe)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accesos/ingreso')
      .send({ sedeId: 1, placa: 'ABC123', confianzaLectura: 150 })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });
});
