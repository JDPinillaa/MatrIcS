import { Inject, Injectable } from '@nestjs/common';
import type { UsuarioPerfil } from '../../../domain/auth/auth.types';
import { AuthenticationException } from '../../../domain/exceptions/authentication.exception';
import {
  USUARIO_REPOSITORY_PORT,
  type IUsuarioRepository,
} from '../../../domain/ports/usuario.repository.port';

/**
 * Caso de uso HU-01: retorna el perfil del usuario en sesión.
 * Si el usuario fue eliminado o desactivado después de iniciar sesión, la sesión deja de ser válida.
 */
@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY_PORT)
    private readonly usuarioRepository: IUsuarioRepository,
  ) {}

  async execute(userId: number): Promise<UsuarioPerfil> {
    const usuario = await this.usuarioRepository.findById(userId);

    if (!usuario || !usuario.activo) {
      throw new AuthenticationException(
        'La sesión ya no es válida',
        'SESSION_INVALID',
      );
    }

    return usuario;
  }
}
