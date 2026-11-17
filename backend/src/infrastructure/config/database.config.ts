import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

/**
 * Lee y normaliza los parámetros de conexión a PostgreSQL desde variables de entorno.
 */
export function getDatabaseConfig(configService: ConfigService): DatabaseConfig {
  return {
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: Number(configService.get<string>('DB_PORT', '5432')),
    user: configService.get<string>('DB_USER', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'matrics_parqueadero'),
    ssl: configService.get<string>('DB_SSL', 'false') === 'true',
  };
}
