import { Injectable } from '@nestjs/common';
import type {
  ElectronicInvoiceReceipt,
  ElectronicInvoiceRequest,
  IElectronicInvoicingPort,
} from '../../domain/ports/electronic-invoicing.port';

/**
 * Adaptador nulo para facturación electrónica en el MVP.
 * Mantiene el flujo de pagos desacoplado hasta integrar un proveedor DIAN productivo.
 */
@Injectable()
export class NoopElectronicInvoicingAdapter
  implements IElectronicInvoicingPort
{
  async emitInvoice(
    request: ElectronicInvoiceRequest,
  ): Promise<ElectronicInvoiceReceipt> {
    return {
      emitida: false,
      cufe: null,
      numeroFactura: null,
      estado: 'NO_CONFIGURADA',
      detalle: `Facturación electrónica diferida fuera del MVP para el pago #${request.pagoId} (placa ${request.placa}).`,
    };
  }
}
