import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  RegisterEntryUseCase,
  type RegisterEntryResult,
} from '../../application/use-cases/access/register-entry.use-case';
import {
  RegisterExitUseCase,
  type RegisterExitResult,
} from '../../application/use-cases/access/register-exit.use-case';
import {
  ValidateManualAccessUseCase,
  type ValidateManualAccessResult,
} from '../../application/use-cases/access/validate-manual-access.use-case';
import type { SedeConfig } from '../../domain/access/access.types';
import { DomainNotFoundException } from '../../domain/exceptions/domain-not-found.exception';
import {
  SEDE_CONFIG_REPOSITORY_PORT,
  type ISedeConfigRepository,
} from '../../domain/ports/sede-config.repository.port';
import { RegistroAccesoDto } from '../dto/registro-acceso.dto';
import {
  ActualizarUmbralConfianzaDto,
  ValidacionManualDto,
} from '../dto/validacion-manual.dto';

@Controller()
export class AccessController {
  constructor(
    private readonly registerEntryUseCase: RegisterEntryUseCase,
    private readonly registerExitUseCase: RegisterExitUseCase,
    private readonly validateManualAccessUseCase: ValidateManualAccessUseCase,
    @Inject(SEDE_CONFIG_REPOSITORY_PORT)
    private readonly sedeConfigRepository: ISedeConfigRepository,
  ) {}

  @Post('accesos/ingreso')
  async registrarIngreso(
    @Body() dto: RegistroAccesoDto,
  ): Promise<RegisterEntryResult> {
    return this.registerEntryUseCase.execute({
      sedeId: dto.sedeId,
      placa: dto.placa,
      confianzaLectura: dto.confianzaLectura,
    });
  }

  @Post('accesos/validacion-manual')
  @HttpCode(HttpStatus.OK)
  async validarLecturaManual(
    @Body() dto: ValidacionManualDto,
  ): Promise<ValidateManualAccessResult> {
    return this.validateManualAccessUseCase.execute({
      sedeId: dto.sedeId,
      tipoEvento: dto.tipoEvento,
      accion: dto.accion,
      placaCorregida: dto.placaCorregida,
      confianzaOriginal: dto.confianzaOriginal,
      usuarioId: dto.usuarioId,
    });
  }

  @Post('accesos/salida')
  @HttpCode(HttpStatus.OK)
  async registrarSalida(
    @Body() dto: RegistroAccesoDto,
  ): Promise<RegisterExitResult> {
    return this.registerExitUseCase.execute({
      sedeId: dto.sedeId,
      placa: dto.placa,
      confianzaLectura: dto.confianzaLectura,
    });
  }

  @Get('sedes/:sedeId/umbral-confianza')
  async obtenerUmbralConfianza(
    @Param('sedeId', ParseIntPipe) sedeId: number,
  ): Promise<SedeConfig> {
    const sede = await this.sedeConfigRepository.findActiveById(sedeId);
    if (!sede) {
      throw new DomainNotFoundException(
        `No se encontró una sede activa con id ${sedeId}.`,
        'SITE_NOT_FOUND',
      );
    }
    return sede;
  }

  @Put('sedes/:sedeId/umbral-confianza')
  async actualizarUmbralConfianza(
    @Param('sedeId', ParseIntPipe) sedeId: number,
    @Body() dto: ActualizarUmbralConfianzaDto,
  ): Promise<SedeConfig> {
    const updated = this.sedeConfigRepository.updateConfidenceThreshold
      ? await this.sedeConfigRepository.updateConfidenceThreshold(
          sedeId,
          dto.umbralConfianza,
        )
      : null;

    if (!updated) {
      throw new DomainNotFoundException(
        `No se encontró una sede activa con id ${sedeId}.`,
        'SITE_NOT_FOUND',
      );
    }
    return updated;
  }
}
