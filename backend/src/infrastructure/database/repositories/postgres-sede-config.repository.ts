import { Inject, Injectable } from '@nestjs/common';
import type { SedeConfig } from '../../../domain/access/access.types';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';
import type { ISedeConfigRepository } from '../../../domain/ports/sede-config.repository.port';

interface SedeRow {
  id: string | number;
  nombre: string;
  umbral_confianza: string | number;
  activa: boolean;
}

@Injectable()
export class PostgresSedeConfigRepository implements ISedeConfigRepository {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async findActiveById(sedeId: number): Promise<SedeConfig | null> {
    const rows = await this.db.query<SedeRow>(
      `SELECT id, nombre, umbral_confianza, activa
       FROM sedes
       WHERE id = $1 AND activa = TRUE
       LIMIT 1`,
      [sedeId],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      nombre: row.nombre,
      umbralConfianza: Number(row.umbral_confianza),
      activa: Boolean(row.activa),
    };
  }

  async updateConfidenceThreshold(
    sedeId: number,
    umbralConfianza: number,
  ): Promise<SedeConfig | null> {
    const rows = await this.db.query<SedeRow>(
      `UPDATE sedes
       SET umbral_confianza = $2
       WHERE id = $1 AND activa = TRUE
       RETURNING id, nombre, umbral_confianza, activa`,
      [sedeId, umbralConfianza],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      nombre: row.nombre,
      umbralConfianza: Number(row.umbral_confianza),
      activa: Boolean(row.activa),
    };
  }
}
