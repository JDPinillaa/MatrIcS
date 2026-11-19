/**
 * Excepción de dominio cuando una entidad o recurso requerido no existe.
 * Mantiene el núcleo desacoplado de códigos o clases de transporte HTTP.
 */
export class DomainNotFoundException extends Error {
  public readonly code: string;

  constructor(message: string, code = 'RESOURCE_NOT_FOUND') {
    super(message);
    this.name = 'DomainNotFoundException';
    this.code = code;
    Object.setPrototypeOf(this, DomainNotFoundException.prototype);
  }
}
