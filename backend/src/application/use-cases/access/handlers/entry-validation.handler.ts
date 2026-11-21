import type {
  BarrierResult,
  CupoSnapshot,
  SedeConfig,
  VehicleType,
} from '../../../../domain/access/access.types';

export interface EntryValidationContext {
  sede: SedeConfig;
  placa: string;
  tipoVehiculo: VehicleType;
  confianzaLectura: number;
  reservedCupo?: CupoSnapshot;
}

export interface EntryBlockedOutcome {
  allowed: false;
  requiereValidacionManual: boolean;
  resultadoBarrera: BarrierResult;
  motivo: string;
}

/**
 * Contrato de la cadena de validaciones del carril de entrada (Patrón Chain of Responsibility).
 * Cada eslabón decide si detiene el ingreso devolviendo un bloqueo o delega al siguiente eslabón.
 */
export interface IEntryValidationHandler {
  setNext(handler: IEntryValidationHandler): IEntryValidationHandler;
  handle(context: EntryValidationContext): Promise<EntryBlockedOutcome | null>;
}

export abstract class AbstractEntryValidationHandler
  implements IEntryValidationHandler
{
  private nextHandler: IEntryValidationHandler | null = null;

  setNext(handler: IEntryValidationHandler): IEntryValidationHandler {
    this.nextHandler = handler;
    return handler;
  }

  async handle(
    context: EntryValidationContext,
  ): Promise<EntryBlockedOutcome | null> {
    if (!this.nextHandler) {
      return null;
    }
    return this.nextHandler.handle(context);
  }
}
