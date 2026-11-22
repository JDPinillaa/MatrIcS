import { NoopElectronicInvoicingAdapter } from './noop-electronic-invoicing.adapter';

describe('NoopElectronicInvoicingAdapter (Interfaz DIAN MVP)', () => {
  it('retorna recibo controlado NO_CONFIGURADA sin bloquear el flujo de pagos', async () => {
    const adapter = new NoopElectronicInvoicingAdapter();

    const receipt = await adapter.emitInvoice({
      pagoId: 15,
      cobroId: 55,
      sedeId: 1,
      placa: 'ABC123',
      monto: 4000,
      moneda: 'COP',
      fechaPago: new Date('2026-11-21T16:00:00.000Z'),
    });

    expect(receipt).toEqual({
      emitida: false,
      cufe: null,
      numeroFactura: null,
      estado: 'NO_CONFIGURADA',
      detalle:
        'Facturación electrónica diferida fuera del MVP para el pago #15 (placa ABC123).',
    });
  });
});
