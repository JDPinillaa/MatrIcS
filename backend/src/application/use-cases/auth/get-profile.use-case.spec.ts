import type { UsuarioPerfil } from '../../../domain/auth/auth.types';
import { AuthenticationException } from '../../../domain/exceptions/authentication.exception';
import type { IUsuarioRepository } from '../../../domain/ports/usuario.repository.port';
import { GetProfileUseCase } from './get-profile.use-case';

describe('GetProfileUseCase (HU-01)', () => {
  const operador: UsuarioPerfil = {
    id: 2,
    nombreCompleto: 'Operador de Carril y Caja',
    email: 'operador@parqueadero.local',
    rol: 'OPERADOR',
    activo: true,
  };

  function buildUseCase(usuario: UsuarioPerfil | null) {
    const usuarioRepository: jest.Mocked<IUsuarioRepository> = {
      verifyCredentials: jest.fn(),
      findById: jest.fn().mockResolvedValue(usuario),
    };
    return { useCase: new GetProfileUseCase(usuarioRepository), usuarioRepository };
  }

  it('retorna el perfil del usuario en sesión', async () => {
    const { useCase, usuarioRepository } = buildUseCase(operador);

    await expect(useCase.execute(2)).resolves.toEqual(operador);
    expect(usuarioRepository.findById).toHaveBeenCalledWith(2);
  });

  it('invalida la sesión si el usuario ya no existe', async () => {
    const { useCase } = buildUseCase(null);

    await expect(useCase.execute(99)).rejects.toBeInstanceOf(AuthenticationException);
  });

  it('invalida la sesión si el usuario fue desactivado', async () => {
    const { useCase } = buildUseCase({ ...operador, activo: false });

    await expect(useCase.execute(2)).rejects.toBeInstanceOf(AuthenticationException);
  });
});
