import { Inject, Injectable } from '@nestjs/common';
import { isUserRole, type UsuarioPerfil } from '../../../domain/auth/auth.types';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';
import type { IUsuarioRepository } from '../../../domain/ports/usuario.repository.port';

interface UsuarioRow {
  id: string | number;
  nombre_completo: string;
  email: string;
  rol: string;
  activo: boolean;
}

const SELECT_USUARIO = `
  SELECT u.id, u.nombre_completo, u.email, r.nombre AS rol, u.activo
  FROM usuarios AS u
  JOIN roles AS r ON r.id = u.rol_id`;

/**
 * Repositorio PostgreSQL de usuarios (HU-01).
 * Las contraseñas se guardan como hash bcrypt generado con pgcrypto (`crypt` + `gen_salt('bf')`,
 * ver database/init/02-seed.sql); por eso la comparación se hace en la base de datos con `crypt`,
 * que re-calcula el hash con la misma sal y nunca devuelve el hash a la aplicación.
 */
@Injectable()
export class PostgresUsuarioRepository implements IUsuarioRepository {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly db: IDatabaseConnection,
  ) {}

  async verifyCredentials(email: string, password: string): Promise<UsuarioPerfil | null> {
    const rows = await this.db.query<UsuarioRow>(
      `${SELECT_USUARIO}
       WHERE u.email = $1
         AND u.password_hash = crypt($2, u.password_hash)
       LIMIT 1`,
      [email, password],
    );

    return this.toPerfil(rows[0]);
  }

  async findById(id: number): Promise<UsuarioPerfil | null> {
    const rows = await this.db.query<UsuarioRow>(
      `${SELECT_USUARIO}
       WHERE u.id = $1
       LIMIT 1`,
      [id],
    );

    return this.toPerfil(rows[0]);
  }

  private toPerfil(row: UsuarioRow | undefined): UsuarioPerfil | null {
    if (!row || !isUserRole(row.rol)) {
      return null;
    }

    return {
      id: Number(row.id),
      nombreCompleto: row.nombre_completo,
      email: row.email,
      rol: row.rol,
      activo: Boolean(row.activo),
    };
  }
}
