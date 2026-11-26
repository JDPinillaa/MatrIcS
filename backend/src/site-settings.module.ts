import { Module } from '@nestjs/common';
import { GetSiteSettingsUseCase } from './application/use-cases/settings/get-site-settings.use-case';
import { UpdateCapacitiesUseCase } from './application/use-cases/settings/update-capacities.use-case';
import { UpdateTariffsUseCase } from './application/use-cases/settings/update-tariffs.use-case';
import { UpdateTimeBandsUseCase } from './application/use-cases/settings/update-time-bands.use-case';
import { SITE_SETTINGS_REPOSITORY_PORT } from './domain/ports/site-settings.repository.port';
import { PostgresSiteSettingsRepository } from './infrastructure/database/repositories/postgres-site-settings.repository';
import { SiteSettingsController } from './presentation/controllers/site-settings.controller';

/** Módulo de administración de tarifas, franjas y cupos (HU-02). */
@Module({
  controllers: [SiteSettingsController],
  providers: [
    {
      provide: SITE_SETTINGS_REPOSITORY_PORT,
      useClass: PostgresSiteSettingsRepository,
    },
    GetSiteSettingsUseCase,
    UpdateTariffsUseCase,
    UpdateTimeBandsUseCase,
    UpdateCapacitiesUseCase,
  ],
})
export class SiteSettingsModule {}