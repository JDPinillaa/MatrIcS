import {DomainNotFoundException} from '../../../domain/exceptions/domain-not-found.exception';
import type {ISiteSettingsRepository} from '../../../domain/ports/site-settings.repository.port';
import type{SiteSettings} from '../../../domain/settings/site-settings.types';


export async function requireSiteSettings(
    repository: ISiteSettingsRepository,
    sedeId: number,
): Promise<SiteSettings> {
    const setting = await repository.findBySedeId(sedeId);
    if (!setting) {
        throw new DomainNotFoundException(`No se encontró una sede activa con id ${sedeId}.`,
            'SITE_NOT_FOUND',
        );
    }
    return setting;
}


