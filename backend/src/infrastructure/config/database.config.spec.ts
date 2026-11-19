import { ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './database.config';

function createMockConfigService(env: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: string) => {
      const value = env[key];
      return value !== undefined ? value : defaultValue;
    }),
  } as unknown as ConfigService;
}

describe('getDatabaseConfig', () => {
  it('prioriza las variables DB_* sobre POSTGRES_* cuando ambas están definidas', () => {
    const configService = createMockConfigService({
      DB_HOST: 'db-host',
      DB_PORT: '5433',
      DB_USER: 'custom_user',
      DB_PASSWORD: 'custom_password',
      DB_NAME: 'custom_db',
      DB_SSL: 'false',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'parqueadero_user',
      POSTGRES_PASSWORD: 'root_password',
      POSTGRES_DB: 'parqueadero',
    });

    expect(getDatabaseConfig(configService)).toEqual({
      host: 'db-host',
      port: 5433,
      user: 'custom_user',
      password: 'custom_password',
      database: 'custom_db',
      ssl: false,
    });
  });

  it('hace fallback automático a POSTGRES_* del .env raíz de docker-compose', () => {
    const configService = createMockConfigService({
      POSTGRES_PORT: '5439',
      POSTGRES_USER: 'parqueadero_user',
      POSTGRES_PASSWORD: 'clave_compose',
      POSTGRES_DB: 'parqueadero',
    });

    expect(getDatabaseConfig(configService)).toEqual({
      host: 'localhost',
      port: 5439,
      user: 'parqueadero_user',
      password: 'clave_compose',
      database: 'parqueadero',
      ssl: false,
    });
  });

  it('retorna valores por defecto seguros alineados con TT-02 cuando no hay variables ni puerto válido', () => {
    const configService = createMockConfigService({
      DB_PORT: 'no-numerico',
      DB_USER: '   ',
    });

    expect(getDatabaseConfig(configService)).toEqual({
      host: 'localhost',
      port: 5432,
      user: 'parqueadero_user',
      password: '',
      database: 'parqueadero',
      ssl: false,
    });
  });

  it('activa SSL cuando DB_SSL es "true"', () => {
    const configService = createMockConfigService({
      DB_SSL: 'true',
    });

    expect(getDatabaseConfig(configService).ssl).toBe(true);
  });
});
