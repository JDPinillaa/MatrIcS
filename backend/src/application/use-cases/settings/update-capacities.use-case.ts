import { Inject, Injectable } from '@nestjs/common';
import type { VehicleType } from '../../../domain/access/access.types';
import {
  SITE_SETTINGS_REPOSITORY_PORT,
  type ISiteSettingsRepository,
} from '../../../domain/ports/site-settings.repository.port';
import { assertValidCapacity } from '../../../domain/settings/capacity.policy';
import type { CapacitiesInput, SiteSettings } from '../../../domain/settings/site-settings.types';
import { requireSiteSettings } from './require-site-settings';

/** Caso de uso HU-02: define la capacidad máxima de carros y motos de forma independiente. */
@Injectable()
export class UpdateCapacitiesUseCase {
  constructor(
    @Inject(SITE_SETTINGS_REPOSITORY_PORT)
    private readonly repository: ISiteSettingsRepository,
  ) {}

  async execute(sedeId: number, input: CapacitiesInput): Promise<SiteSettings> {
    const current = await requireSiteSettings(this.repository, sedeId);
    const occupiedOf = (tipo: VehicleType): number =>
      current.cupos.find((cupo) => cupo.tipoVehiculo === tipo)?.ocupados ?? 0;

    assertValidCapacity('CARRO', input.capacidadCarros, occupiedOf('CARRO'));
    assertValidCapacity('MOTO', input.capacidadMotos, occupiedOf('MOTO'));

    await this.repository.updateCapacities(sedeId, input);
    return requireSiteSettings(this.repository, sedeId);
  }
}