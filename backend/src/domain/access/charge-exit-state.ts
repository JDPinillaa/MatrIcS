import type { ChargeStatus, CobroSummary, VehicleType } from './access.types';

/**
 * Patrón State para la regla de negocio RN-06:
 * encapsula si un estado de cobro autoriza la apertura de la barrera de salida
 * y cuál es el mensaje explicativo mostrado al operador.
 */
export interface IChargeExitState {
  readonly name: ChargeStatus | 'SIN_COBRO';
  permiteSalida(): boolean;
  obtenerMotivo(tipoVehiculo: VehicleType): string;
}

export class PendingChargeState implements IChargeExitState {
  public readonly name: ChargeStatus = 'PENDIENTE';

  permiteSalida(): boolean {
    return false;
  }

  obtenerMotivo(): string {
    return 'Barrera Cerrada: Cobro pendiente de pago';
  }
}

export class PaidChargeState implements IChargeExitState {
  public readonly name: ChargeStatus = 'PAGADO';

  permiteSalida(): boolean {
    return true;
  }

  obtenerMotivo(): string {
    return 'Barrera Abierta: Pase diario vigente';
  }
}

export class ExemptChargeState implements IChargeExitState {
  public readonly name: ChargeStatus = 'EXENTO';

  permiteSalida(): boolean {
    return true;
  }

  obtenerMotivo(tipoVehiculo: VehicleType): string {
    return tipoVehiculo === 'MOTO'
      ? 'Barrera Abierta: Moto exenta de cobro'
      : 'Barrera Abierta: Vehículo exento de cobro';
  }
}

export class VoidedChargeState implements IChargeExitState {
  public readonly name: ChargeStatus = 'ANULADO';

  permiteSalida(): boolean {
    return true;
  }

  obtenerMotivo(): string {
    return 'Barrera Abierta: Cobro anulado, salida autorizada';
  }
}

export class NoChargeState implements IChargeExitState {
  public readonly name = 'SIN_COBRO' as const;

  permiteSalida(): boolean {
    return true;
  }

  obtenerMotivo(tipoVehiculo: VehicleType): string {
    return tipoVehiculo === 'MOTO'
      ? 'Barrera Abierta: Moto exenta de cobro'
      : 'Barrera Abierta: Sin cobro pendiente para el día operativo';
  }
}

const STATE_BY_STATUS: Record<ChargeStatus, IChargeExitState> = {
  PENDIENTE: new PendingChargeState(),
  PAGADO: new PaidChargeState(),
  EXENTO: new ExemptChargeState(),
  ANULADO: new VoidedChargeState(),
};

const NO_CHARGE_STATE = new NoChargeState();

export function resolveChargeExitState(
  cobro: Pick<CobroSummary, 'estado'> | null,
): IChargeExitState {
  if (!cobro) {
    return NO_CHARGE_STATE;
  }
  return STATE_BY_STATUS[cobro.estado];
}
