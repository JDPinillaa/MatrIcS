export const CLOCK_PORT = Symbol('CLOCK_PORT');

/**
 * Abstracción de reloj del sistema para pruebas determinísticas de fecha/hora y día operativo (DIP).
 */
export interface IClock {
  now(): Date;
}
