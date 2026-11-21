import type { TokenPayload } from '../auth/auth.types';

export const TOKEN_SERVICE_PORT = Symbol('TOKEN_SERVICE_PORT');

/**
 * Puerto para emitir y validar tokens de sesión (JWT) sin acoplar el dominio a una librería.
 */
export interface ITokenService {
  sign(payload: TokenPayload): string;
  /** Retorna el payload si el token es auténtico y no ha expirado; si no, null. */
  verify(token: string): TokenPayload | null;
}
