import type { TarifaFranja } from './billing.types';

const BOGOTA_UTC_OFFSET_SECONDS = -5 * 60 * 60;
const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Convierte `HH:MM` o `HH:MM:SS` en segundos desde la medianoche.
 */
export function parseTimeOfDay(value: string): number {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!match) {
    throw new Error(`Hora inválida: "${value}"`);
  }

  const [, hours, minutes, seconds = '0'] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

/**
 * Segundos transcurridos desde la medianoche en hora de Bogotá (UTC-5, sin horario de verano).
 */
export function secondsOfDayInBogota(instant: Date): number {
  const localSeconds =
    Math.floor(instant.getTime() / 1000) + BOGOTA_UTC_OFFSET_SECONDS;
  return ((localSeconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
}

/**
 * Indica si un instante cae dentro de la franja.
 * La hora fin se toma como el último minuto completo de la franja (17:59 → hasta 17:59:59),
 * y se soportan franjas que cruzan la medianoche (p. ej. NOCTURNA 18:00 a 05:59).
 */
export function isWithinTimeBand(
  instant: Date,
  band: Pick<TarifaFranja, 'horaInicio' | 'horaFin'>,
): boolean {
  const now = secondsOfDayInBogota(instant);
  const start = parseTimeOfDay(band.horaInicio);
  const rawEnd = parseTimeOfDay(band.horaFin);
  // Si la hora fin no trae segundos (17:59 o 17:59:00), cubre el minuto completo.
  const end = rawEnd % 60 === 0 ? rawEnd + 59 : rawEnd;

  if (start <= end) {
    return now >= start && now <= end;
  }

  return now >= start || now <= end;
}

/**
 * Retorna la tarifa de la franja en la que cae el instante de ingreso, o null si ninguna aplica.
 */
export function resolveTimeBand(
  instant: Date,
  tarifas: readonly TarifaFranja[],
): TarifaFranja | null {
  return tarifas.find((tarifa) => isWithinTimeBand(instant, tarifa)) ?? null;
}
