import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { IDatabaseConnection } from '../../domain/ports/database-connection.port';
import { getDatabaseConfig } from '../config/database.config';

/**
 * Adaptador de PostgreSQL que implementa el puerto IDatabaseConnection usando pg.Pool.
 */
@Injectable()
export class PostgresConnectionAdapter
  implements IDatabaseConnection, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    const dbConfig = getDatabaseConfig(configService);
    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 2000,
    });
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
