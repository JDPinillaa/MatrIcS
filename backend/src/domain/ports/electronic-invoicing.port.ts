export const ELECTRONIC_INVOICING_PORT = Symbol('ELECTRONIC_INVOICING_PORT');

export interface ElectronicInvoiceRequest {
  pagoId: number;
  cobroId: number;
  sedeId: number;
  placa: string;
  monto: number;
  moneda: 'COP';
  fechaPago: Date;
  clienteDocumento?: string;
}

export interface ElectronicInvoiceReceipt {
  emitida: boolean;
  cufe: string | null;
  numeroFactura: string | null;
  estado: 'NO_CONFIGURADA' | 'EMITIDA' | 'RECHAZADA';
  detalle: string;
}

/**
 * Interfaz de Facturación Electrónica (DIAN) definida por contrato en el MVP.
 * La integración real queda fuera del alcance del MVP; esta abstracción permite
 * incorporar un adaptador productivo sin modificar la lógica de pagos (OCP + DIP).
 */
export interface IElectronicInvoicingPort {
  emitInvoice(
    request: ElectronicInvoiceRequest,
  ): Promise<ElectronicInvoiceReceipt>;
}
