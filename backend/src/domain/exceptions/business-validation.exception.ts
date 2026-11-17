/**
 * Excepción de dominio para violaciones a reglas de negocio.
 * Mantiene el núcleo desacoplado de códigos o clases de transporte HTTP.
 */
export class BusinessValidationException extends Error {
  public readonly code: string;

  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION') {
    super(message);
    this.name = 'BusinessValidationException';
    this.code = code;
    Object.setPrototypeOf(this, BusinessValidationException.prototype);
  }
}
