import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../../domain/auth/auth.types';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import type { AuthenticatedRequest } from './authenticated-request';

/**
 * Guardia global de autorización por rol (HU-01).
 * Se ejecuta después del JwtAuthGuard y responde 403 cuando el rol del usuario
 * no está entre los permitidos por @Roles(...).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const allowedRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      throw new UnauthorizedException({
        message: 'Credenciales inválidas o sesión expirada',
        code: 'HTTP_401',
      });
    }

    if (!allowedRoles.includes(user.rol)) {
      throw new ForbiddenException({
        message: `El rol ${user.rol} no tiene permisos para realizar esta operación`,
        code: 'HTTP_403',
      });
    }

    return true;
  }
}
