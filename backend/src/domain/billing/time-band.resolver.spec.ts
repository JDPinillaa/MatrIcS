import type { TarifaFranja } from './billing.types';
import {
  isWithinTimeBand,
  parseTimeOfDay,
  resolveTimeBand,
  secondsOfDayInBogota,
} from './time-band.resolver';

describe('Resolución de franja horaria (HU-05)', () => {
  // Franjas sembradas en database/init/02-seed.sql
  const tarifasCarro: TarifaFranja[] = [
    {
      franja: 'DIURNA',
      horaInicio: '06:00:00',
      horaFin: '17:59:00',
      valor: 4000,
    },
    {
      franja: 'NOCTURNA',
      horaInicio: '18:00:00',
      horaFin: '05:59:00',
      valor: 2500,
    },
  ];

  const bogota = (isoLocal: string) => new Date(`${isoLocal}-05:00`);

  it('convierte horas HH:MM y HH:MM:SS a segundos', () => {
    expect(parseTimeOfDay('06:00')).toBe(21600);
    expect(parseTimeOfDay('17:59:30')).toBe(17 * 3600 + 59 * 60 + 30);
    expect(() => parseTimeOfDay('mediodía')).toThrow();
  });

  it('calcula la hora local de Bogotá a partir de un instante UTC', () => {
    expect(secondsOfDayInBogota(new Date('2026-11-21T05:00:00.000Z'))).toBe(0);
    expect(secondsOfDayInBogota(bogota('2026-11-21T10:30:00'))).toBe(
      10 * 3600 + 30 * 60,
    );
  });

  it.each([
    ['2026-11-21T06:00:00', 'DIURNA'],
    ['2026-11-21T12:00:00', 'DIURNA'],
    ['2026-11-21T17:59:59', 'DIURNA'],
    ['2026-11-21T18:00:00', 'NOCTURNA'],
    ['2026-11-21T23:59:59', 'NOCTURNA'],
    ['2026-11-22T00:00:00', 'NOCTURNA'],
    ['2026-11-22T02:30:00', 'NOCTURNA'],
    ['2026-11-22T05:59:59', 'NOCTURNA'],
  ])(
    'un ingreso a las %s (Bogotá) cae en la franja %s',
    (local, franjaEsperada) => {
      expect(resolveTimeBand(bogota(local), tarifasCarro)?.franja).toBe(
        franjaEsperada,
      );
    },
  );

  it('soporta franjas configuradas sin cruce de medianoche', () => {
    const band = { horaInicio: '08:00', horaFin: '12:00' };

    expect(isWithinTimeBand(bogota('2026-11-21T07:59:59'), band)).toBe(false);
    expect(isWithinTimeBand(bogota('2026-11-21T12:00:59'), band)).toBe(true);
    expect(isWithinTimeBand(bogota('2026-11-21T12:01:00'), band)).toBe(false);
  });

  it('retorna null si ninguna franja cubre la hora del ingreso', () => {
    const soloManana: TarifaFranja[] = [
      { franja: 'DIURNA', horaInicio: '06:00', horaFin: '11:59', valor: 4000 },
    ];

    expect(
      resolveTimeBand(bogota('2026-11-21T15:00:00'), soloManana),
    ).toBeNull();
  });
});
