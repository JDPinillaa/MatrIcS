import { Inject, Injectable } from '@nestjs/common';
import type { VehicleType } from '../../../domain/access/access.types';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';
import type { ISiteSettingsRepository } from '../../../domain/ports/site-settings.repository.port';
import type {
  BandName,
  CapacitiesInput,
  SiteSettings,
  TariffsInput,
  TimeBandsInput,
} from '../../../domain/settings/site-settings.types';

interface SedeRow {
  id: string | number;
  nombre: string;
  umbral_confianza: string | number;
}
interface TarifaRow {
  tipo_vehiculo: VehicleType;
  franja: BandName;
  valor: string | number;
}
interface FranjaRow {
  nombre: BandName;
  hora_inicio: string;
  hora_fin: string;
}
interface CupoRow {
  tipo_vehiculo: VehicleType;
  capacidad_maxima: string | number;
  ocupados: string | number;
}

@Injectable()
export class PostgresSiteSettingsRepository implements ISiteSettingsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async findBySedeId(sedeId: number): Promise<SiteSettings | null> {
    const sedes = await this.db.query<SedeRow>(
      `SELECT id, nombre, umbral_confianza
       FROM sedes
       WHERE id = $1 AND activa = TRUE`,
      [sedeId],
    );
    const sede = sedes[0];
    if (!sede) {
      return null;
    }

    const [tarifas, franjas, cupos] = await Promise.all([
      this.db.query<TarifaRow>(
        `SELECT tv.codigo AS tipo_vehiculo, fh.nombre AS franja, t.valor
         FROM tarifas t
         INNER JOIN franjas_horarias fh ON fh.id = t.franja_id
         INNER JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
         WHERE fh.sede_id = $1
         ORDER BY tv.codigo, fh.nombre`,
        [sedeId],
      ),
      this.db.query<FranjaRow>(
        `SELECT nombre,
                TO_CHAR(hora_inicio, 'HH24:MI:SS') AS hora_inicio,
                TO_CHAR(hora_fin, 'HH24:MI:SS') AS hora_fin
         FROM franjas_horarias
         WHERE sede_id = $1
         ORDER BY nombre`,
        [sedeId],
      ),
      this.db.query<CupoRow>(
        `SELECT tv.codigo AS tipo_vehiculo, c.capacidad_maxima, c.ocupados
         FROM cupos c
         INNER JOIN tipos_vehiculo tv ON tv.id = c.tipo_vehiculo_id
         WHERE c.sede_id = $1
         ORDER BY tv.codigo`,
        [sedeId],
      ),
    ]);

    return {
      sedeId: Number(sede.id),
      nombreSede: sede.nombre,
      umbralConfianza: Number(sede.umbral_confianza),
      tarifas: tarifas.map((row) => ({
        tipoVehiculo: row.tipo_vehiculo,
        franja: row.franja,
        valor: Number(row.valor),
      })),
      franjas: franjas.map((row) => ({
        nombre: row.nombre,
        horaInicio: row.hora_inicio,
        horaFin: row.hora_fin,
      })),
      cupos: cupos.map((row) => {
        const capacidadMaxima = Number(row.capacidad_maxima);
        const ocupados = Number(row.ocupados);
        return {
          tipoVehiculo: row.tipo_vehiculo,
          capacidadMaxima,
          ocupados,
          disponibles: capacidadMaxima - ocupados,
        };
      }),
    };
  }

  async updateTariffs(sedeId: number, input: TariffsInput): Promise<void> {
    await this.db.query(
      `UPDATE tarifas t
       SET valor = v.valor
       FROM franjas_horarias fh,
            tipos_vehiculo tv,
            (VALUES
               ('DIURNA',   'CARRO', $2::numeric),
               ('NOCTURNA', 'CARRO', $3::numeric),
               ('DIURNA',   'MOTO',  $4::numeric),
               ('NOCTURNA', 'MOTO',  $5::numeric)
            ) AS v (franja, tipo, valor)
       WHERE t.franja_id = fh.id
         AND t.tipo_vehiculo_id = tv.id
         AND fh.sede_id = $1
         AND fh.nombre = v.franja
         AND tv.codigo = v.tipo`,
      [
        sedeId,
        input.carroDiurna,
        input.carroNocturna,
        input.motoDiurna,
        input.motoNocturna,
      ],
    );
  }

  async updateTimeBands(sedeId: number, input: TimeBandsInput): Promise<void> {
    await this.db.query(
      `UPDATE franjas_horarias fh
       SET hora_inicio = v.inicio::time,
           hora_fin = v.fin::time
       FROM (VALUES
               ('DIURNA',   $2::text, $3::text),
               ('NOCTURNA', $4::text, $5::text)
            ) AS v (nombre, inicio, fin)
       WHERE fh.sede_id = $1
         AND fh.nombre = v.nombre`,
      [
        sedeId,
        input.diurnaInicio,
        input.diurnaFin,
        input.nocturnaInicio,
        input.nocturnaFin,
      ],
    );
  }

  async updateCapacities(sedeId: number, input: CapacitiesInput): Promise<void> {
    await this.db.query(
      `UPDATE cupos c
       SET capacidad_maxima = v.capacidad
       FROM tipos_vehiculo tv,
            (VALUES
               ('CARRO', $2::int),
               ('MOTO',  $3::int)
            ) AS v (tipo, capacidad)
       WHERE c.tipo_vehiculo_id = tv.id
         AND c.sede_id = $1
         AND tv.codigo = v.tipo`,
      [sedeId, input.capacidadCarros, input.capacidadMotos],
    );
  }
}