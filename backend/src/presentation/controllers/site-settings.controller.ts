import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { GetSiteSettingsUseCase } from '../../application/use-cases/settings/get-site-settings.use-case';
import { UpdateCapacitiesUseCase } from '../../application/use-cases/settings/update-capacities.use-case';
import { UpdateTariffsUseCase } from '../../application/use-cases/settings/update-tariffs.use-case';
import { UpdateTimeBandsUseCase } from '../../application/use-cases/settings/update-time-bands.use-case';
import type { SiteSettings } from '../../domain/settings/site-settings.types';
import { Roles } from '../auth/auth.decorators';
import {
  ActualizarCuposDto,
  ActualizarFranjasDto,
  ActualizarTarifasDto,
} from '../dto/site-settings.dto';

/**
 * Administración de tarifas, franjas horarias y cupos de la sede (HU-02).
 * Exclusivo del rol ADMINISTRADOR (HU-01).
 */
@Roles('ADMINISTRADOR')
@Controller('sedes/:sedeId')
export class SiteSettingsController {
  constructor(
    private readonly getSiteSettingsUseCase: GetSiteSettingsUseCase,
    private readonly updateTariffsUseCase: UpdateTariffsUseCase,
    private readonly updateTimeBandsUseCase: UpdateTimeBandsUseCase,
    private readonly updateCapacitiesUseCase: UpdateCapacitiesUseCase,
  ) {}

  @Get('configuracion')
  obtenerConfiguracion(
    @Param('sedeId', ParseIntPipe) sedeId: number,
  ): Promise<SiteSettings> {
    return this.getSiteSettingsUseCase.execute(sedeId);
  }

  @Put('tarifas')
  actualizarTarifas(
    @Param('sedeId', ParseIntPipe) sedeId: number,
    @Body() dto: ActualizarTarifasDto,
  ): Promise<SiteSettings> {
    return this.updateTariffsUseCase.execute(sedeId, dto);
  }

  @Put('franjas')
  actualizarFranjas(
    @Param('sedeId', ParseIntPipe) sedeId: number,
    @Body() dto: ActualizarFranjasDto,
  ): Promise<SiteSettings> {
    return this.updateTimeBandsUseCase.execute(sedeId, dto);
  }

  @Put('cupos')
  actualizarCupos(
    @Param('sedeId', ParseIntPipe) sedeId: number,
    @Body() dto: ActualizarCuposDto,
  ): Promise<SiteSettings> {
    return this.updateCapacitiesUseCase.execute(sedeId, dto);
  }
}