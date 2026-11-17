import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
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
});
