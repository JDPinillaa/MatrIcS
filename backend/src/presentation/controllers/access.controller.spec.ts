import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RegisterEntryUseCase } from '../../application/use-cases/access/register-entry.use-case';
import { RegisterExitUseCase } from '../../application/use-cases/access/register-exit.use-case';
import { ValidateManualAccessUseCase } from '../../application/use-cases/access/validate-manual-access.use-case';
import { configureApp } from '../../bootstrap';
import type { EventoAccesoRecord } from '../../domain/access/access.types';
import { PlateClassifier } from '../../domain/access/plate-classifier';
import { BILLING_GENERATOR_PORT } from '../../domain/ports/billing-generator.port';
import { CLOCK_PORT } from '../../domain/ports/clock.port';
import {
  COBRO_CONSULTA_REPOSITORY_PORT,
  type ICobroConsultaRepository,
} from '../../domain/ports/cobro-consulta.repository.port';
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

describe('AccessController HTTP Integration (HU-03 & HU-07)', () => {
  let app: INestApplication;
  let sedeRepo: jest.Mocked<ISedeConfigRepository>;
  let cupoRepo: jest.Mocked<ICupoRepository>;
  let eventoRepo: jest.Mocked<IEventoAccesoRepository>;
  let cobroConsultaRepo: jest.Mocked<ICobroConsultaRepository>;

  const fixedNow = new Date('2026-11-21T15:00:00.000Z');

  beforeAll(async () => {
    sedeRepo = {
      findActiveById: jest.fn(),
      updateConfidenceThreshold: jest.fn(),
    };
    cupoRepo = {
      findBySedeAndVehicleType: jest.fn(),
      reserveSpot: jest.fn(),
      releaseSpot: jest.fn(),
    };
    eventoRepo = {
      create: jest.fn(),
    };
    cobroConsultaRepo = {
      findByPlateSedeAndOperationalDay: jest.fn(),
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
        {
          provide: COBRO_CONSULTA_REPOSITORY_PORT,
          useValue: cobroConsultaRepo,
        },
        RegisterEntryUseCase,
        RegisterExitUseCase,
        ValidateManualAccessUseCase,
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

  it('POST /accesos/salida responde 200 CERRADA si el cobro está PENDIENTE (RN-06)', async () => {
    cobroConsultaRepo.findByPlateSedeAndOperationalDay.mockResolvedValue({
      id: 70,
      sedeId: 1,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaDiaOperativo: '2026-11-21',
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
      estado: 'PENDIENTE',
      generadoEn: fixedNow.toISOString(),
      pagadoEn: null,
    });

    const response = await request(app.getHttpServer())
      .post('/accesos/salida')
      .send({ sedeId: 1, placa: 'ABC123', confianzaLectura: 95 })
      .expect(200);

    expect(response.body).toEqual({
      requiereValidacionManual: false,
      resultadoBarrera: 'CERRADA',
      motivo: 'Barrera Cerrada: Cobro pendiente de pago',
      evento: null,
    });
    expect(cupoRepo.releaseSpot).not.toHaveBeenCalled();
  });

  it('POST /accesos/salida responde 200 ABIERTA y libera cupo cuando el cobro está PAGADO', async () => {
    cobroConsultaRepo.findByPlateSedeAndOperationalDay.mockResolvedValue({
      id: 71,
      sedeId: 1,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaDiaOperativo: '2026-11-21',
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
      estado: 'PAGADO',
      generadoEn: fixedNow.toISOString(),
      pagadoEn: fixedNow.toISOString(),
    });
    eventoRepo.create.mockResolvedValue({
      id: 99,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: null,
      placa: 'ABC123',
      tipoEvento: 'SALIDA',
      confianzaLectura: 95,
      lecturaManual: false,
      fechaHora: fixedNow.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Pase diario vigente',
    });

    const response = await request(app.getHttpServer())
      .post('/accesos/salida')
      .send({ sedeId: 1, placa: 'ABC123', confianzaLectura: 95 })
      .expect(200);

    expect(response.body).toMatchObject({
      requiereValidacionManual: false,
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Pase diario vigente',
      evento: { placa: 'ABC123', tipoEvento: 'SALIDA' },
    });
    expect(cupoRepo.releaseSpot).toHaveBeenCalledWith(1, 'CARRO');
  });

  it('HU-04 Caso de Éxito: pausa MNP789 con 60% (<80%) y al confirmar manualmente abre barrera y registra LECTURA_MANUAL', async () => {
    const pausedResponse = await request(app.getHttpServer())
      .post('/accesos/ingreso')
      .send({ sedeId: 1, placa: 'MNP789', confianzaLectura: 60 })
      .expect(201);

    expect(pausedResponse.body).toEqual({
      requiereValidacionManual: true,
      resultadoBarrera: 'CERRADA',
      motivo:
        'Confianza de lectura (60%) inferior al umbral configurado (80%). Requiere validación manual del operador.',
      evento: null,
      cobro: null,
    });
    expect(eventoRepo.create).not.toHaveBeenCalled();

    cupoRepo.findBySedeAndVehicleType.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 10,
    });
    cupoRepo.reserveSpot.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 11,
    });
    eventoRepo.create.mockResolvedValue({
      id: 210,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: 2,
      placa: 'MNP789',
      tipoEvento: 'ENTRADA',
      confianzaLectura: 60,
      lecturaManual: true,
      fechaHora: fixedNow.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo:
        'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)',
    });

    const confirmResponse = await request(app.getHttpServer())
      .post('/accesos/validacion-manual')
      .send({
        sedeId: 1,
        tipoEvento: 'ENTRADA',
        accion: 'CONFIRMAR',
        placaCorregida: 'MNP789',
        confianzaOriginal: 60,
      })
      .expect(200);

    expect(confirmResponse.body).toMatchObject({
      descartado: false,
      resultadoBarrera: 'ABIERTA',
      motivo:
        'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)',
      evento: {
        placa: 'MNP789',
        lecturaManual: true,
        confianzaLectura: 60,
        resultadoBarrera: 'ABIERTA',
      },
    });
  });

  it('HU-04 Caso de Error: rechaza placa corregida con formato inválido (AB12) con HTTP 400 INVALID_PLATE_FORMAT', async () => {
    const response = await request(app.getHttpServer())
      .post('/accesos/validacion-manual')
      .send({
        sedeId: 1,
        tipoEvento: 'ENTRADA',
        accion: 'CONFIRMAR',
        placaCorregida: 'AB12',
        confianzaOriginal: 60,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'INVALID_PLATE_FORMAT',
      path: '/accesos/validacion-manual',
    });
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('HU-04: permite descartar una lectura dudosa (DESCARTAR) manteniendo la barrera CERRADA', async () => {
    const response = await request(app.getHttpServer())
      .post('/accesos/validacion-manual')
      .send({
        sedeId: 1,
        tipoEvento: 'ENTRADA',
        accion: 'DESCARTAR',
        confianzaOriginal: 60,
      })
      .expect(200);

    expect(response.body).toEqual({
      descartado: true,
      resultadoBarrera: 'CERRADA',
      motivo:
        'Barrera Cerrada: Lectura descartada manualmente por el operador (LECTURA_MANUAL)',
      evento: null,
      cobro: null,
    });
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('HU-04: permite actualizar el umbral de confianza de la sede con PUT /sedes/:sedeId/umbral-confianza', async () => {
    (sedeRepo.updateConfidenceThreshold as jest.Mock).mockResolvedValue({
      id: 1,
      nombre: 'Sede Principal',
      umbralConfianza: 85,
      activa: true,
    });

    const response = await request(app.getHttpServer())
      .put('/sedes/1/umbral-confianza')
      .send({ umbralConfianza: 85 })
      .expect(200);

    expect(response.body).toEqual({
      id: 1,
      nombre: 'Sede Principal',
      umbralConfianza: 85,
      activa: true,
    });
    expect(sedeRepo.updateConfidenceThreshold).toHaveBeenCalledWith(1, 85);
  });
});
