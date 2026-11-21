import { Inject, Injectable } from '@nestjs/common';
import type { VehicleType } from '../../../domain/access/access.types';
import type { TarifaFranja } from '../../../domain/billing/billing.types';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';
import type { ITarifaRepository } from '../../../domain/ports/tarifa.repository.port';

interface TarifaRow {
  franja: string;
  hora_inicio: string;
  hora_fin: string;
  valor: string | number;
}

@Injectable()
export class PostgresTarifaRepository implements ITarifaRepository {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async findBySedeAndVehicleType(
    sedeId: number,
    tipoVehiculo: VehicleType,
  ): Promise<TarifaFranja[]> {
    const rows = await this.db.query<TarifaRow>(
      `SELECT
         fh.nombre AS franja,
         TO_CHAR(fh.hora_inicio, 'HH24:MI:SS') AS hora_inicio,
         TO_CHAR(fh.hora_fin, 'HH24:MI:SS') AS hora_fin,
         t.valor
       FROM tarifas t
       INNER JOIN franjas_horarias fh ON fh.id = t.franja_id
       INNER JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
       WHERE fh.sede_id = $1
         AND tv.codigo = $2
       ORDER BY fh.hora_inicio`,
      [sedeId, tipoVehiculo],
    );

    return rows.map((row) => ({
      franja: row.franja,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      valor: Number(row.valor),
    }));
  }
}
