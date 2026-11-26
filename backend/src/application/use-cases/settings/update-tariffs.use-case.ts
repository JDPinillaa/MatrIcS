import {Inject, Injectable} from '@nestjs/common';

import{
    SITE_SETTINGS_REPOSITORY_PORT,
    type ISiteSettingsRepository,
} from '../../../domain/ports/site-settings.repository.port';

import type {SiteSettings, TariffsInput}  from '../../../domain/settings/site-settings.types';

import { assertValidTariffs} from '../../../domain/settings/tariff.policy';
import {requireSiteSettings} from './require-site-settings';

/**Caso de uso HU-02: actualiza tarifas validando RN-01 y RN-02 antes de escribir */
@Injectable()
export class UpdateTariffsUseCase {
    constructor(
        @Inject(SITE_SETTINGS_REPOSITORY_PORT)
        private readonly repository: ISiteSettingsRepository,
    ) {}

    async execute(sedeId: number, input: TariffsInput): Promise<SiteSettings> {
        assertValidTariffs(input);
        await requireSiteSettings(this.repository, sedeId);
        await this.repository.updateTariffs(sedeId, input);
        return requireSiteSettings(this.repository, sedeId);
    }
}

