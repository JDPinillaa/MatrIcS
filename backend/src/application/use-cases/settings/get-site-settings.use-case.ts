import {Inject, Injectable} from '@nestjs/common';
import{
    SITE_SETTINGS_REPOSITORY_PORT,
    type ISiteSettingsRepository,

} from '../../../domain/ports/site-settings.repository.port';

import type {SiteSettings} from '../../../domain/settings/site-settings.types';
import { requireSiteSettings} from './require-site-settings';

/**Caso de uso HU-02: Consulta tarifas, franjas y cupos vigentes de la sede */

@Injectable()
export class GetSiteSettingsUseCase {
    constructor(
        @Inject(SITE_SETTINGS_REPOSITORY_PORT)
        private readonly repository: ISiteSettingsRepository,
    ) {}

    execute(sedeId: number): Promise<SiteSettings> {
        return requireSiteSettings(this.repository, sedeId);
    }
    
}
