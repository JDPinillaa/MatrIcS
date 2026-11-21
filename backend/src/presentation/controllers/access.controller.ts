import { Body, Controller, Post } from '@nestjs/common';
import {
  RegisterEntryUseCase,
  type RegisterEntryResult,
} from '../../application/use-cases/access/register-entry.use-case';
import { RegistroAccesoDto } from '../dto/registro-acceso.dto';

@Controller('accesos')
export class AccessController {
  constructor(private readonly registerEntryUseCase: RegisterEntryUseCase) {}

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
}
