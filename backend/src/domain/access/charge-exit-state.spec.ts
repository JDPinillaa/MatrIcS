import { resolveChargeExitState } from './charge-exit-state';

describe('ChargeExitState (Patrón State / RN-06)', () => {
  it('bloquea la salida cuando el cobro está PENDIENTE', () => {
    const state = resolveChargeExitState({ estado: 'PENDIENTE' });
    expect(state.permiteSalida()).toBe(false);
    expect(state.obtenerMotivo('CARRO')).toBe(
      'Barrera Cerrada: Cobro pendiente de pago',
    );
  });

  it('autoriza la salida cuando el cobro está PAGADO (pase diario vigente)', () => {
    const state = resolveChargeExitState({ estado: 'PAGADO' });
    expect(state.permiteSalida()).toBe(true);
    expect(state.obtenerMotivo('CARRO')).toBe(
      'Barrera Abierta: Pase diario vigente',
    );
  });

  it('autoriza la salida cuando el cobro está EXENTO (moto y carro)', () => {
    const state = resolveChargeExitState({ estado: 'EXENTO' });
    expect(state.permiteSalida()).toBe(true);
    expect(state.obtenerMotivo('MOTO')).toBe(
      'Barrera Abierta: Moto exenta de cobro',
    );
    expect(state.obtenerMotivo('CARRO')).toBe(
      'Barrera Abierta: Vehículo exento de cobro',
    );
  });

  it('autoriza la salida cuando el cobro está ANULADO', () => {
    const state = resolveChargeExitState({ estado: 'ANULADO' });
    expect(state.permiteSalida()).toBe(true);
    expect(state.obtenerMotivo('CARRO')).toBe(
      'Barrera Abierta: Cobro anulado, salida autorizada',
    );
  });

  it('autoriza la salida cuando no existe cobro para el día operativo (moto exenta o sin cobro)', () => {
    const state = resolveChargeExitState(null);
    expect(state.permiteSalida()).toBe(true);
    expect(state.obtenerMotivo('MOTO')).toBe(
      'Barrera Abierta: Moto exenta de cobro',
    );
    expect(state.obtenerMotivo('CARRO')).toBe(
      'Barrera Abierta: Sin cobro pendiente para el día operativo',
    );
  });
});
