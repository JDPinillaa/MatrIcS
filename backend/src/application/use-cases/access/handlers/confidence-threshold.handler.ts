import {
  AbstractEntryValidationHandler,
  type EntryBlockedOutcome,
  type EntryValidationContext,
} from './entry-validation.handler';

/**
 * Eslabón 1 (HU-03 / HU-04): pausa la apertura automática cuando la confianza
 * de lectura es inferior al umbral configurado para la sede.
 */
export class ConfidenceThresholdHandler extends AbstractEntryValidationHandler {
  async handle(
    context: EntryValidationContext,
  ): Promise<EntryBlockedOutcome | null> {
    if (context.confianzaLectura < context.sede.umbralConfianza) {
      return {
        allowed: false,
        requiereValidacionManual: true,
        resultadoBarrera: 'CERRADA',
        motivo: `Confianza de lectura (${context.confianzaLectura}%) inferior al umbral configurado (${context.sede.umbralConfianza}%). Requiere validación manual del operador.`,
      };
    }

    return super.handle(context);
  }
}
