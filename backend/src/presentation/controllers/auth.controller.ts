import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { GetProfileUseCase } from '../../application/use-cases/auth/get-profile.use-case';
import {
  LoginUseCase,
  type LoginResult,
} from '../../application/use-cases/auth/login.use-case';
import type { UsuarioAutenticado, UsuarioPerfil } from '../../domain/auth/auth.types';
import { CurrentUser, Public } from '../auth/auth.decorators';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.loginUseCase.execute({ email: dto.email, password: dto.password });
  }

  @Get('perfil')
  async perfil(@CurrentUser() user: UsuarioAutenticado): Promise<UsuarioPerfil> {
    return this.getProfileUseCase.execute(user.id);
  }
}
