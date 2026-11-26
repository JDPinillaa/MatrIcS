import type{
    CapacitiesInput,
    SiteSettings,
    TariffsInput,
    TimeBandsInput,
} from '../settings/site-settings.types';

export const SITE_SETTINGS_REPOSITORY_PORT = Symbol('SITE_SETTINGS_REPOSITORY_PORT');

/**
 * Puerte de parametrizacion de la sede: taridas, franjas y cupos
 * Separado de los puertos operaticos para que billing/access no dependan de métodos de escritura.
 */

export interface ISiteSettingsRepository {
    findBySedeId(sedeId:number): Promise<SiteSettings | null>;
    updateTariffs(sedeId:number, input: TariffsInput): Promise<void>;
    updateTimeBands(sedeId:number, input: TimeBandsInput): Promise<void>;
    updateCapacities(sedeId:number, input: CapacitiesInput): Promise<void>;
}