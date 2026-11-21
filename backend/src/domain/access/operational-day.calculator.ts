const BOGOTA_UTC_OFFSET_HOURS = -5;
const OPERATIONAL_DAY_START_HOUR = 6;
const TOTAL_SHIFT_MS =
  (BOGOTA_UTC_OFFSET_HOURS - OPERATIONAL_DAY_START_HOUR) * 60 * 60 * 1000;

/**
 * Calcula la fecha del día operativo (`YYYY-MM-DD`) según el Supuesto S-02:
 * el día operativo inicia a las 06:00:00 y finaliza a las 05:59:59 del día
 * calendario siguiente en zona horaria `America/Bogota` (UTC-5, sin DST).
 * Equivale a `fn_dia_operativo(p_instante)` en `database/init/01-schema.sql`.
 */
export function calculateOperationalDay(instant: Date): string {
  const shifted = new Date(instant.getTime() + TOTAL_SHIFT_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
