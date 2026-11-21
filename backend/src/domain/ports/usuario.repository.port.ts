import type { UsuarioPerfil } from '../auth/auth.types';

export const USUARIO_REPOSITORY_PORT = Symbol('USUARIO_REPOSITORY_PORT');

/**
 * Puerto segregado para consultar usuarios y verificar credenciales (ISP + DIP).
 * La verificación del hash se delega al adaptador para no exponer el hash fuera de la infraestructura.
 */
export interface IUsuarioRepository {
  /** Retorna el usuario si el email existe y la contraseña coincide con su hash; si no, null. */
  verifyCredentials(email: string, password: string): Promise<UsuarioPerfil | null>;
  findById(id: number): Promise<UsuarioPerfil | null>;
}
