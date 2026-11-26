import { Inject, Injectable } from '@nestjs/common';
import {
  SITE_SETTINGS_REPOSITORY_PORT,
  type ISiteSettingsRepository,
} from '../../../domain/ports/site-settings.repository.port';
import type { SiteSettings, TimeBandsInput } from '../../../domain/settings/site-settings.types';
import { assertBandsCoverTheDay } from '../../../domain/settings/time-band.policy';
import { requireSiteSettings } from './require-site-settings';

/** Caso de uso HU-02: define el horario de las franjas DIURNA y NOCTURNA. */
@Injectable()
export class UpdateTimeBandsUseCase {
  constructor(
    @Inject(SITE_SETTINGS_REPOSITORY_PORT)
    private readonly repository: ISiteSettingsRepository,
  ) {}

  async execute(sedeId: number, input: TimeBandsInput): Promise<SiteSettings> {
    assertBandsCoverTheDay(input);
    await requireSiteSettings(this.repository, sedeId);
    await this.repository.updateTimeBands(sedeId, input);
    return requireSiteSettings(this.repository, sedeId);
  }
}