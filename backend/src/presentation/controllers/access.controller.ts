import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  RegisterEntryUseCase,
  type RegisterEntryResult,
} from '../../application/use-cases/access/register-entry.use-case';
import {
  RegisterExitUseCase,
  type RegisterExitResult,
} from '../../application/use-cases/access/register-exit.use-case';
import { RegistroAccesoDto } from '../dto/registro-acceso.dto';

@Controller('accesos')
export class AccessController {
  constructor(
    private readonly registerEntryUseCase: RegisterEntryUseCase,
    private readonly registerExitUseCase: RegisterExitUseCase,
  ) {}

  @Post('ingreso')
  async registrarIngreso(
    @Body() dto: RegistroAccesoDto,
  ): Promise<RegisterEntryResult> {
    return this.registerEntryUseCase.execute({
      sedeId: dto.sedeId,
      placa: dto.placa,
      confianzaLectura: dto.confianzaLectura,
    });
  }

  @Post('salida')
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
}
