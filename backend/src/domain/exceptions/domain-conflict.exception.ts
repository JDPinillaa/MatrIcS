/**
 * Excepción de dominio para conflictos de estado o duplicidad de registros.
 * Mantiene el núcleo desacoplado de códigos o clases de transporte HTTP.
 */
export class DomainConflictException extends Error {
  public readonly code: string;

  constructor(message: string, code = 'DOMAIN_CONFLICT') {
    super(message);
    this.name = 'DomainConflictException';
    this.code = code;
    Object.setPrototypeOf(this, DomainConflictException.prototype);
  }
}
