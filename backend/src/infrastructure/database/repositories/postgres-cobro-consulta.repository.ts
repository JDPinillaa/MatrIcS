import { Inject, Injectable } from '@nestjs/common';
import type {
  ChargeStatus,
  CobroSummary,
  VehicleType,
} from '../../../domain/access/access.types';
import type { ICobroConsultaRepository } from '../../../domain/ports/cobro-consulta.repository.port';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';

interface CobroConsultaRow {
  id: string | number;
  sede_id: string | number;
  placa: string;
  tipo_vehiculo: VehicleType;
  fecha_dia_operativo: string;
  franja_aplicada: string;
  valor_aplicado: string | number;
  estado: ChargeStatus;
  generado_en: Date | string;
  pagado_en: Date | string | null;
}

@Injectable()
export class PostgresCobroConsultaRepository
  implements ICobroConsultaRepository
{
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async findByPlateSedeAndOperationalDay(
    placa: string,
    sedeId: number,
    operationalDay: string,
  ): Promise<CobroSummary | null> {
    const rows = await this.db.query<CobroConsultaRow>(
      `SELECT
         c.id,
         c.sede_id,
         c.placa,
         tv.codigo AS tipo_vehiculo,
         TO_CHAR(c.fecha_dia_operativo, 'YYYY-MM-DD') AS fecha_dia_operativo,
         c.franja_aplicada,
         c.valor_aplicado,
         c.estado,
         c.generado_en,
         p.pagado_en
       FROM cobros c
       INNER JOIN tipos_vehiculo tv ON tv.id = c.tipo_vehiculo_id
       LEFT JOIN pagos p ON p.cobro_id = c.id
       WHERE c.placa = $1
         AND c.sede_id = $2
         AND c.fecha_dia_operativo = $3::date
       LIMIT 1`,
      [placa, sedeId, operationalDay],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      sedeId: Number(row.sede_id),
      placa: row.placa,
      tipoVehiculo: row.tipo_vehiculo,
      fechaDiaOperativo: row.fecha_dia_operativo,
      franjaAplicada: row.franja_aplicada,
      valorAplicado: Number(row.valor_aplicado),
      estado: row.estado,
      generadoEn:
        row.generado_en instanceof Date
          ? row.generado_en.toISOString()
          : new Date(row.generado_en).toISOString(),
      pagadoEn:
        row.pagado_en === null
          ? null
          : row.pagado_en instanceof Date
            ? row.pagado_en.toISOString()
            : new Date(row.pagado_en).toISOString(),
    };
  }
}
