import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TOKEN_SERVICE_PORT,
  type ITokenService,
} from '../../domain/ports/token-service.port';
import { IS_PUBLIC_KEY } from './auth.decorators';
import type { AuthenticatedRequest } from './authenticated-request';

/**
 * Guardia global de autenticación (HU-01).
 * Exige el encabezado `Authorization: Bearer <token>` en todo endpoint que no sea @Public()
 * y responde 401 si falta, es inválido o expiró.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SERVICE_PORT) private readonly tokenService: ITokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    const payload = token ? this.tokenService.verify(token) : null;

    if (!payload) {
      throw new UnauthorizedException({
        message: 'Credenciales inválidas o sesión expirada',
        code: 'HTTP_401',
      });
    }

    request.user = { id: payload.sub, email: payload.email, rol: payload.rol };
    return true;
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header) {
      return null;
    }

    const [scheme, token] = header.trim().split(/\s+/);
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
