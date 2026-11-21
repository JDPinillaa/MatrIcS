import { Inject, Injectable } from '@nestjs/common';
import type { UsuarioPerfil } from '../../../domain/auth/auth.types';
import { AuthenticationException } from '../../../domain/exceptions/authentication.exception';
import {
  TOKEN_SERVICE_PORT,
  type ITokenService,
} from '../../../domain/ports/token-service.port';
import {
  USUARIO_REPOSITORY_PORT,
  type IUsuarioRepository,
} from '../../../domain/ports/usuario.repository.port';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  usuario: UsuarioPerfil;
}

/**
 * Caso de uso HU-01: inicia sesión con email y contraseña y emite un token con el rol del usuario.
 * El mensaje de error es el mismo para email inexistente, contraseña errada o usuario inactivo,
 * para no revelar qué cuentas existen.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY_PORT)
    private readonly usuarioRepository: IUsuarioRepository,
    @Inject(TOKEN_SERVICE_PORT)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = command.email.trim().toLowerCase();
    const usuario = await this.usuarioRepository.verifyCredentials(
      email,
      command.password,
    );

    if (!usuario || !usuario.activo) {
      throw new AuthenticationException('Credenciales inválidas');
    }

    const accessToken = this.tokenService.sign({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    return { accessToken, usuario };
  }
}
