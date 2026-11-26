import {parseTimeOfDay} from '../billing/time-band.resolver';
import { BusinessValidationException} from '../exceptions/business-validation.exception';
import type {TimeBandsInput} from './site-settings.types';

const SECONDS_PER_DAY= 24*60*60;

/** Mismo criterio del resolver */

function endOfBand(value: string): number {
    const raw = parseTimeOfDay(value);
    return raw % 60 === 0 ? raw + 59 :raw;
}

function lengthOfBand(start:number, end:number): number{
    return (((end -start +1 ) % SECONDS_PER_DAY) + SECONDS_PER_DAY) %SECONDS_PER_DAY;

}

/**
 * Las franjas diurna y nocturna deben repartirse las 24 hrs sin solaparse y sin dejar huecos
 * de esta manera todo ingreso cae en exactamente un franja
 */

export function assertBandsCoverTheDay(input: TimeBandsInput): void {
    const dayStart = parseTimeOfDay(input.diurnaInicio);
    const dayEnd = endOfBand(input.diurnaFin);
    const nightStart = parseTimeOfDay(input.nocturnaInicio);
    const nightEnd = endOfBand(input.nocturnaFin);

    const dayThenNight = (dayEnd+1) % SECONDS_PER_DAY === nightStart;
    const nightThenDay = (nightEnd +1) %SECONDS_PER_DAY === dayStart;
    const coversWholeDay = lengthOfBand(dayStart, dayEnd) + lengthOfBand(nightStart, nightEnd) ===SECONDS_PER_DAY;

    if (!dayThenNight || !nightThenDay || !coversWholeDay){
        throw new BusinessValidationException('Las franjas diurna y nocturna no pueden solaparse ni dejar horas sin cubrir: cada una debe empezar justo cuando termina la otra.',
            'INVALID_TIME_BANDS',
        );
    }
}   
