import { BusinessValidationException } from '../exceptions/business-validation.exception';
import { assertBandsCoverTheDay } from './time-band.policy';

describe('Política de franjas horarias (HU-02)', () => {
  const bands = (
    diurnaInicio: string,
    diurnaFin: string,
    nocturnaInicio: string,
    nocturnaFin: string,
  ) => ({ diurnaInicio, diurnaFin, nocturnaInicio, nocturnaFin });

  it.each([
    ['las del seed (HH:MM)', bands('06:00', '17:59', '18:00', '05:59')],
    ['el formato del contrato (HH:MM:SS)', bands('06:00:00', '17:59:59', '18:00:00', '05:59:59')],
    ['otro corte válido', bands('07:00', '18:59', '19:00', '06:59')],
  ])('acepta %s', (_name, input) => {
    expect(() => assertBandsCoverTheDay(input)).not.toThrow();
  });

  it.each([
    ['un hueco entre franjas', bands('06:00', '17:59', '19:00', '05:59')],
    ['un solapamiento', bands('06:00', '18:59', '18:00', '05:59')],
    ['dos franjas que cubren todo el día', bands('00:00', '23:59', '00:00', '23:59')],
  ])('rechaza %s', (_name, input) => {
    expect(() => assertBandsCoverTheDay(input)).toThrow(BusinessValidationException);
  });
});