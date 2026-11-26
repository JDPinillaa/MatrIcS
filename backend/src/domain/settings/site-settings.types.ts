import type {VehicleType} from '../access/access.types';

export type BandName = 'DIURNA' | 'NOCTURNA';

export interface TariffSetting {
    tipoVehiculo: VehicleType;
    franja: BandName;
    valor: number;
}

export interface TimeBandSetting {
    nombre: BandName;
    horaInicio: string;
    horaFin: string;
}

export interface CapacitySetting {
    tipoVehiculo: VehicleType;
    capacidadMaxima: number;
    ocupados: number;
    disponibles: number;
}

/**Parametrización completa de una sede */

export interface SiteSettings {
    sedeId: number;
    nombreSede: string;
    umbralConfianza: number;
    tarifas: TariffSetting[];
    franjas: TimeBandSetting[];
    cupos: CapacitySetting[];
    
}

export interface TariffsInput {
    carroDiurna: number;
    carroNocturna: number;
    motoDiurna: number;
    motoNocturna: number;
}

export interface TimeBandsInput{
    diurnaInicio: string;
    diurnaFin: string;
    nocturnaInicio: string;
    nocturnaFin: string;
}

export interface CapacitiesInput{
    capacidadCarros: number;
    capacidadMotos: number;
}