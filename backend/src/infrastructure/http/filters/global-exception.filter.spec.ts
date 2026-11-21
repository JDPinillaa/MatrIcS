import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticationException } from '../../../domain/exceptions/authentication.exception';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainConflictException } from '../../../domain/exceptions/domain-conflict.exception';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  function createMockHost(url = '/test-endpoint') {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url }),
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  }

  it('intercepta BusinessValidationException y responde 400 JSON sin trazas internas', () => {
    const { host, status, json } = createMockHost('/tarifas');
    const exception = new BusinessValidationException(
      'La tarifa nocturna debe ser menor a la diurna',
      'RN02_INVALID_NIGHT_RATE',
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'RN02_INVALID_NIGHT_RATE',
      message: 'La tarifa nocturna debe ser menor a la diurna',
      path: '/tarifas',
    });
    expect(body).not.toHaveProperty('stack');
  });

  it.each([
    [new BadRequestException('Datos inválidos'), 400, 'Bad Request'],
    [new UnauthorizedException('Token requerido'), 401, 'Unauthorized'],
    [new ForbiddenException('Rol sin permisos'), 403, 'Forbidden'],
    [new NotFoundException('Recurso no encontrado'), 404, 'Not Found'],
    [new ConflictException('Cobro duplicado'), 409, 'Conflict'],
    [
      new InternalServerErrorException('Fallo controlado'),
      500,
      'Internal Server Error',
    ],
  ])(
    'estandariza %p en respuesta HTTP %i',
    (exception, expectedStatus, expectedError) => {
      const { host, status, json } = createMockHost('/api/recurso');

      filter.catch(exception, host);

      expect(status).toHaveBeenCalledWith(expectedStatus);
      expect(json.mock.calls[0][0]).toMatchObject({
        statusCode: expectedStatus,
        error: expectedError,
        path: '/api/recurso',
      });
    },
  );

  it('oculta detalles internos ante un Error genérico inesperado (500)', () => {
    const { host, status, json } = createMockHost('/error-interno');
    const loggerSpy = jest
      .spyOn((filter as unknown as { logger: { error: jest.Mock } }).logger, 'error')
      .mockImplementation();

    filter.catch(new Error('SELECT * FROM secret_table failed'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
      path: '/error-interno',
    });
    expect(JSON.stringify(body)).not.toContain('secret_table');
    expect(body).not.toHaveProperty('stack');
    loggerSpy.mockRestore();
  });

  it('intercepta DomainConflictException y responde 409 JSON sin trazas internas', () => {
    const { host, status, json } = createMockHost('/pagos');
    const exception = new DomainConflictException(
      'El cobro ya fue pagado previamente',
      'CHARGE_ALREADY_PAID',
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      code: 'CHARGE_ALREADY_PAID',
      message: 'El cobro ya fue pagado previamente',
      path: '/pagos',
    });
    expect(body).not.toHaveProperty('stack');
  });

  it('intercepta DomainNotFoundException y responde 404 JSON sin trazas internas', () => {
    const { host, status, json } = createMockHost('/cobros/pendiente');
    const exception = new DomainNotFoundException(
      'No se encontró cobro pendiente para la placa ABC123',
      'CHARGE_NOT_FOUND',
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      code: 'CHARGE_NOT_FOUND',
      message: 'No se encontró cobro pendiente para la placa ABC123',
      path: '/cobros/pendiente',
    });
    expect(body).not.toHaveProperty('stack');
  });

  it('traduce error PostgreSQL 23505 (uq_cobros_placa_sede_dia) a 409 sin exponer detail ni stack', () => {
    const { host, status, json } = createMockHost('/accesos/ingreso');
    const pgError = Object.assign(
      new Error('duplicate key value violates unique constraint "uq_cobros_placa_sede_dia"'),
      {
        code: '23505',
        constraint: 'uq_cobros_placa_sede_dia',
        detail: 'Key (placa, sede_id, fecha_dia_operativo)=(ABC123, 1, 2026-11-18) already exists.',
        table: 'cobros',
      },
    );

    filter.catch(pgError, host);

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      code: 'DUPLICATE_DAILY_CHARGE',
      path: '/accesos/ingreso',
    });
    expect(JSON.stringify(body)).not.toContain('Key (placa');
    expect(body).not.toHaveProperty('detail');
    expect(body).not.toHaveProperty('table');
    expect(body).not.toHaveProperty('stack');
  });

  it('traduce error PostgreSQL 23505 (uq_pagos_llave_idempotencia) a 409 DUPLICATE_IDEMPOTENCY_KEY', () => {
    const { host, status, json } = createMockHost('/pagos');
    const pgError = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'uq_pagos_llave_idempotencia',
    });

    filter.catch(pgError, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0]).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      code: 'DUPLICATE_IDEMPOTENCY_KEY',
      path: '/pagos',
    });
  });

  it('traduce error PostgreSQL 23514 (ck_cupos_ocupados) a 400 CAPACITY_LIMIT_EXCEEDED', () => {
    const { host, status, json } = createMockHost('/accesos/ingreso');
    const pgError = Object.assign(new Error('check constraint failed'), {
      code: '23514',
      constraint: 'ck_cupos_ocupados',
    });

    filter.catch(pgError, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'CAPACITY_LIMIT_EXCEEDED',
      path: '/accesos/ingreso',
    });
  });

  it('traduce error PostgreSQL 23503 (foreign_key_violation) a 400 INVALID_REFERENCE', () => {
    const { host, status, json } = createMockHost('/accesos/ingreso');
    const pgError = Object.assign(new Error('foreign key violation'), {
      code: '23503',
      constraint: 'fk_eventos_sede',
    });

    filter.catch(pgError, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'INVALID_REFERENCE',
      path: '/accesos/ingreso',
    });
  });

  it('intercepta AuthenticationException y responde 401 sin revelar el motivo exacto (HU-01)', () => {
    const { host, status, json } = createMockHost('/auth/login');

    filter.catch(new AuthenticationException('Credenciales inválidas'), host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json.mock.calls[0][0]).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales inválidas',
      path: '/auth/login',
    });
  });
});
