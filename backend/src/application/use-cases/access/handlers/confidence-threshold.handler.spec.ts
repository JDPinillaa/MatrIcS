import type { SedeConfig } from '../../../../domain/access/access.types';
import { ConfidenceThresholdHandler } from './confidence-threshold.handler';
import {
  AbstractEntryValidationHandler,
  type EntryBlockedOutcome,
  type EntryValidationContext,
} from './entry-validation.handler';

class SpyNextHandler extends AbstractEntryValidationHandler {
  public called = false;

  async handle(
    context: EntryValidationContext,
  ): Promise<EntryBlockedOutcome | null> {
    this.called = true;
    return super.handle(context);
  }
}

describe('ConfidenceThresholdHandler (HU-04)', () => {
  const sede: SedeConfig = {
    id: 1,
    nombre: 'Sede Principal',
    umbralConfianza: 80,
    activa: true,
  };

  it('detiene el ingreso automático y exige validación manual cuando la confianza es menor al umbral (60% < 80%)', async () => {
    const handler = new ConfidenceThresholdHandler();
    const next = new SpyNextHandler();
    handler.setNext(next);

    const outcome = await handler.handle({
      sede,
      placa: 'MNP789',
      tipoVehiculo: 'CARRO',
      confianzaLectura: 60,
    });

    expect(outcome).toEqual({
      allowed: false,
      requiereValidacionManual: true,
      resultadoBarrera: 'CERRADA',
      motivo:
        'Confianza de lectura (60%) inferior al umbral configurado (80%). Requiere validación manual del operador.',
    });
    expect(next.called).toBe(false);
  });

  it('continúa al siguiente eslabón cuando la confianza es igual o superior al umbral (80% >= 80%)', async () => {
    const handler = new ConfidenceThresholdHandler();
    const next = new SpyNextHandler();
    handler.setNext(next);

    const outcome = await handler.handle({
      sede,
      placa: 'MNP789',
      tipoVehiculo: 'CARRO',
      confianzaLectura: 80,
    });

    expect(outcome).toBeNull();
    expect(next.called).toBe(true);
  });
});
