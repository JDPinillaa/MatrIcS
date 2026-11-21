import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole, UsuarioAutenticado } from '../../domain/auth/auth.types';
import type { AuthenticatedRequest } from './authenticated-request';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';

/**
 * Marca un endpoint (o controlador) como público: no exige sesión.
 * Por defecto TODOS los endpoints requieren un token válido (seguro por defecto).
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restringe un endpoint (o controlador) a los roles indicados.
 * Sin este decorador, cualquier usuario autenticado puede acceder.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Inyecta en el handler el usuario autenticado que adjuntó el JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
