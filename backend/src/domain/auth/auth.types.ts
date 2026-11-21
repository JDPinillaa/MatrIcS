/**
 * Roles soportados por el sistema (HU-01).
 * Deben coincidir con los registros de la tabla `roles` (database/init/02-seed.sql).
 */
export const USER_ROLES = ['OPERADOR', 'ADMINISTRADOR'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Perfil público de un usuario del sistema (nunca incluye el hash de la contraseña).
 * Refleja el esquema `UsuarioPerfil` de openapi.yaml.
 */
export interface UsuarioPerfil {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: UserRole;
  activo: boolean;
}

/**
 * Datos mínimos que viajan dentro del token de sesión.
 */
export interface TokenPayload {
  sub: number;
  email: string;
  rol: UserRole;
}

/**
 * Usuario autenticado que los guardias adjuntan a cada petición protegida.
 */
export interface UsuarioAutenticado {
  id: number;
  email: string;
  rol: UserRole;
}
