import { Inject, Injectable } from '@nestjs/common';
import type {
  ChargeStatus,
  CobroSummary,
  VehicleType,
} from '../../../domain/access/access.types';
import type { CreateCobroInput } from '../../../domain/billing/billing.types';
import { DomainConflictException } from '../../../domain/exceptions/domain-conflict.exception';
import type { ICobroRepository } from '../../../domain/ports/cobro.repository.port';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';

interface CobroRow {
  id: string | number;
  sede_id: string | number;
  placa: string;
  tipo_vehiculo: VehicleType;
  fecha_dia_operativo: string;
  franja_aplicada: string;
  valor_aplicado: string | number;
  estado: ChargeStatus;
  generado_en: Date | string;
}

const UNIQUE_VIOLATION = '23505';
const DAILY_CHARGE_CONSTRAINT = 'uq_cobros_placa_sede_dia';

/**
 * Repositorio PostgreSQL de escritura de cobros (HU-05).
 * La unicidad (placa, sede, día operativo) la garantiza la restricción
 * `uq_cobros_placa_sede_dia`, incluso ante peticiones simultáneas.
 */
@Injectable()
export class PostgresCobroRepository implements ICobroRepository {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async create(input: CreateCobroInput): Promise<CobroSummary> {
    let rows: CobroRow[];
    try {
      rows = await this.db.query<CobroRow>(
        `WITH nuevo AS (
           INSERT INTO cobros (
             sede_id, tipo_vehiculo_id, evento_ingreso_id, placa,
             fecha_dia_operativo, franja_aplicada, valor_aplicado, estado, generado_en
           )
           SELECT $1::bigint, tv.id, $3::bigint, $4::varchar, $5::date,
                  $6::varchar, $7::numeric, $8::varchar, $9::timestamptz
           FROM tipos_vehiculo tv
           WHERE tv.codigo = $2::varchar
           RETURNING id, sede_id, placa, fecha_dia_operativo, franja_aplicada,
                     valor_aplicado, estado, generado_en
         )
         SELECT
           n.id, n.sede_id, n.placa,
           $2::varchar AS tipo_vehiculo,
           TO_CHAR(n.fecha_dia_operativo, 'YYYY-MM-DD') AS fecha_dia_operativo,
           n.franja_aplicada, n.valor_aplicado, n.estado, n.generado_en
         FROM nuevo n`,
        [
          input.sedeId,
          input.tipoVehiculo,
          input.eventoIngresoId,
          input.placa,
          input.fechaDiaOperativo,
          input.franjaAplicada,
          input.valorAplicado,
          input.estado,
          input.generadoEn,
        ],
      );
    } catch (error) {
      if (isDailyChargeDuplicate(error)) {
        throw new DomainConflictException(
          'Ya existe un cobro registrado para esa placa, sede y día operativo',
          'DUPLICATE_DAILY_CHARGE',
        );
      }
      throw error;
    }

    const row = rows[0];
    if (!row) {
      throw new Error(`Tipo de vehículo no registrado: ${input.tipoVehiculo}`);
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
      pagadoEn: null,
    };
  }
}

function isDailyChargeDuplicate(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { code, constraint } = error as {
    code?: unknown;
    constraint?: unknown;
  };
  return code === UNIQUE_VIOLATION && constraint === DAILY_CHARGE_CONSTRAINT;
}
