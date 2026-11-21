/**
 * Excepción de dominio cuando no se puede confirmar la identidad del usuario
 * (credenciales inválidas, usuario inactivo o sesión que ya no es válida).
 * Mantiene el núcleo desacoplado de códigos o clases de transporte HTTP.
 */
export class AuthenticationException extends Error {
  public readonly code: string;

  constructor(message: string, code = 'INVALID_CREDENTIALS') {
    super(message);
    this.name = 'AuthenticationException';
    this.code = code;
    Object.setPrototypeOf(this, AuthenticationException.prototype);
  }
}
