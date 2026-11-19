import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

function getFirstEnv(
  configService: ConfigService,
  keys: readonly string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = configService.get<string>(key);
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return fallback;
}

/**
 * Lee y normaliza los parámetros de conexión a PostgreSQL desde variables de entorno.
 * Prioriza `DB_*` y hace fallback a `POSTGRES_*` del entorno raíz (docker-compose TT-02).
 */
export function getDatabaseConfig(configService: ConfigService): DatabaseConfig {
  const rawPort = getFirstEnv(configService, ['DB_PORT', 'POSTGRES_PORT'], '5432');
  const parsedPort = Number(rawPort);

  return {
    host: getFirstEnv(configService, ['DB_HOST'], 'localhost'),
    port: Number.isNaN(parsedPort) ? 5432 : parsedPort,
    user: getFirstEnv(configService, ['DB_USER', 'POSTGRES_USER'], 'parqueadero_user'),
    password: getFirstEnv(configService, ['DB_PASSWORD', 'POSTGRES_PASSWORD'], ''),
    database: getFirstEnv(configService, ['DB_NAME', 'POSTGRES_DB'], 'parqueadero'),
    ssl: configService.get<string>('DB_SSL', 'false') === 'true',
  };
}
