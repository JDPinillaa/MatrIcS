import { Inject, Injectable } from '@nestjs/common';
import type {
  CupoSnapshot,
  VehicleType,
} from '../../../domain/access/access.types';
import type { ICupoRepository } from '../../../domain/ports/cupo.repository.port';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';

interface CupoRow {
  sede_id: string | number;
  tipo_vehiculo: VehicleType;
  capacidad_maxima: string | number;
  ocupados: string | number;
}

@Injectable()
export class PostgresCupoRepository implements ICupoRepository {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async findBySedeAndVehicleType(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<CupoSnapshot | null> {
    const rows = await this.db.query<CupoRow>(
      `SELECT c.sede_id, tv.codigo AS tipo_vehiculo, c.capacidad_maxima, c.ocupados
       FROM cupos c
       INNER JOIN tipos_vehiculo tv ON tv.id = c.tipo_vehiculo_id
       WHERE c.sede_id = $1 AND tv.codigo = $2
       LIMIT 1`,
      [sedeId, tipoVehiculo],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async reserveSpot(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<CupoSnapshot | null> {
    const rows = await this.db.query<CupoRow>(
      `UPDATE cupos c
       SET ocupados = c.ocupados + 1
       FROM tipos_vehiculo tv
       WHERE c.tipo_vehiculo_id = tv.id
         AND c.sede_id = $1
         AND tv.codigo = $2
         AND c.ocupados < c.capacidad_maxima
       RETURNING c.sede_id, tv.codigo AS tipo_vehiculo, c.capacidad_maxima, c.ocupados`,
      [sedeId, tipoVehiculo],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async releaseSpot(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<CupoSnapshot | null> {
    const rows = await this.db.query<CupoRow>(
      `UPDATE cupos c
       SET ocupados = c.ocupados - 1
       FROM tipos_vehiculo tv
       WHERE c.tipo_vehiculo_id = tv.id
         AND c.sede_id = $1
         AND tv.codigo = $2
         AND c.ocupados > 0
       RETURNING c.sede_id, tv.codigo AS tipo_vehiculo, c.capacidad_maxima, c.ocupados`,
      [sedeId, tipoVehiculo],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: CupoRow): CupoSnapshot {
    return {
      sedeId: Number(row.sede_id),
      tipoVehiculo: row.tipo_vehiculo,
      capacidadMaxima: Number(row.capacidad_maxima),
      ocupados: Number(row.ocupados),
    };
  }
}
