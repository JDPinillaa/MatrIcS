import { Inject, Injectable } from '@nestjs/common';
import type {
  AccessEventType,
  BarrierResult,
  CreateEventoAccesoInput,
  EventoAccesoRecord,
} from '../../../domain/access/access.types';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';
import type { IEventoAccesoRepository } from '../../../domain/ports/evento-acceso.repository.port';

interface EventoAccesoRow {
  id: string | number;
  sede_id: string | number;
  usuario_id: string | number | null;
  placa: string;
  tipo_evento: AccessEventType;
  confianza_lectura: string | number;
  lectura_manual: boolean;
  fecha_hora: Date | string;
  resultado_barrera: BarrierResult;
  motivo: string | null;
}

@Injectable()
export class PostgresEventoAccesoRepository implements IEventoAccesoRepository {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async create(input: CreateEventoAccesoInput): Promise<EventoAccesoRecord> {
    const rows = await this.db.query<EventoAccesoRow>(
      `INSERT INTO eventos_acceso (
         sede_id,
         tipo_vehiculo_id,
         usuario_id,
         placa,
         tipo_evento,
         confianza_lectura,
         lectura_manual,
         fecha_hora,
         resultado_barrera,
         motivo
       )
       SELECT
         $1,
         tv.id,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9
       FROM tipos_vehiculo tv
       WHERE tv.codigo = $10
       RETURNING
         id,
         sede_id,
         usuario_id,
         placa,
         tipo_evento,
         confianza_lectura,
         lectura_manual,
         fecha_hora,
         resultado_barrera,
         motivo`,
      [
        input.sedeId,
        input.usuarioId,
        input.placa,
        input.tipoEvento,
        input.confianzaLectura,
        input.lecturaManual,
        input.fechaHora.toISOString(),
        input.resultadoBarrera,
        input.motivo,
        input.tipoVehiculo,
      ],
    );

    const row = rows[0];
    if (!row) {
      throw new Error(
        `No se encontró el tipo de vehículo "${input.tipoVehiculo}" en tipos_vehiculo.`,
      );
    }

    return {
      id: Number(row.id),
      sedeId: Number(row.sede_id),
      tipoVehiculo: input.tipoVehiculo,
      usuarioId: row.usuario_id !== null ? Number(row.usuario_id) : null,
      placa: row.placa,
      tipoEvento: row.tipo_evento,
      confianzaLectura: Number(row.confianza_lectura),
      lecturaManual: Boolean(row.lectura_manual),
      fechaHora:
        row.fecha_hora instanceof Date
          ? row.fecha_hora.toISOString()
          : new Date(row.fecha_hora).toISOString(),
      resultadoBarrera: row.resultado_barrera,
      motivo: row.motivo,
    };
  }
}
