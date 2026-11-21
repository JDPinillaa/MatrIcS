import { calculateOperationalDay } from './operational-day.calculator';

describe('calculateOperationalDay (Supuesto S-02: 06:00 a 05:59 America/Bogota)', () => {
  it('asigna un ingreso a las 02:30 AM del martes (Bogotá) al día operativo del lunes', () => {
    const tuesday0230Bogota = new Date('2026-11-17T02:30:00-05:00');
    expect(calculateOperationalDay(tuesday0230Bogota)).toBe('2026-11-16');
  });

  it('mantiene las 05:59:59 AM (Bogotá) en el día operativo anterior', () => {
    const beforeCutoff = new Date('2026-11-17T05:59:59-05:00');
    expect(calculateOperationalDay(beforeCutoff)).toBe('2026-11-16');
  });

  it('inicia el nuevo día operativo exactamente a las 06:00:00 AM (Bogotá)', () => {
    const exactStart = new Date('2026-11-17T06:00:00-05:00');
    expect(calculateOperationalDay(exactStart)).toBe('2026-11-17');
  });

  it('mantiene las 23:59:59 PM (Bogotá) en el mismo día operativo', () => {
    const lateNight = new Date('2026-11-17T23:59:59-05:00');
    expect(calculateOperationalDay(lateNight)).toBe('2026-11-17');
  });

  it('maneja correctamente el cambio de año en madrugada (01-ene 03:00 -> 31-dic)', () => {
    const newYearEarlyMorning = new Date('2026-01-01T03:00:00-05:00');
    expect(calculateOperationalDay(newYearEarlyMorning)).toBe('2025-12-31');
  });
});
