import type { UsuarioPerfil } from '../../../domain/auth/auth.types';
import { AuthenticationException } from '../../../domain/exceptions/authentication.exception';
import type { ITokenService } from '../../../domain/ports/token-service.port';
import type { IUsuarioRepository } from '../../../domain/ports/usuario.repository.port';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase (HU-01)', () => {
  const admin: UsuarioPerfil = {
    id: 1,
    nombreCompleto: 'Administrador del Sistema',
    email: 'admin@parqueadero.local',
    rol: 'ADMINISTRADOR',
    activo: true,
  };

  function buildUseCase(usuario: UsuarioPerfil | null) {
    const usuarioRepository: jest.Mocked<IUsuarioRepository> = {
      verifyCredentials: jest.fn().mockResolvedValue(usuario),
      findById: jest.fn(),
    };
    const tokenService: jest.Mocked<ITokenService> = {
      sign: jest.fn().mockReturnValue('token-firmado'),
      verify: jest.fn(),
    };

    return {
      useCase: new LoginUseCase(usuarioRepository, tokenService),
      usuarioRepository,
      tokenService,
    };
  }

  it('retorna el token y el perfil cuando las credenciales son válidas', async () => {
    const { useCase, tokenService } = buildUseCase(admin);

    const result = await useCase.execute({
      email: 'admin@parqueadero.local',
      password: 'ClaveCorrecta1*',
    });

    expect(result).toEqual({ accessToken: 'token-firmado', usuario: admin });
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: 1,
      email: 'admin@parqueadero.local',
      rol: 'ADMINISTRADOR',
    });
  });

  it('normaliza el email (espacios y mayúsculas) antes de consultar', async () => {
    const { useCase, usuarioRepository } = buildUseCase(admin);

    await useCase.execute({ email: '  Admin@Parqueadero.LOCAL ', password: 'x' });

    expect(usuarioRepository.verifyCredentials).toHaveBeenCalledWith(
      'admin@parqueadero.local',
      'x',
    );
  });

  it('rechaza credenciales inválidas sin emitir token', async () => {
    const { useCase, tokenService } = buildUseCase(null);

    await expect(
      useCase.execute({ email: 'admin@parqueadero.local', password: 'errada' }),
    ).rejects.toBeInstanceOf(AuthenticationException);
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('rechaza a un usuario inactivo aunque la contraseña sea correcta', async () => {
    const { useCase, tokenService } = buildUseCase({ ...admin, activo: false });

    await expect(
      useCase.execute({ email: 'admin@parqueadero.local', password: 'ClaveCorrecta1*' }),
    ).rejects.toBeInstanceOf(AuthenticationException);
    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
