import type { Request } from 'express';
import type { UsuarioAutenticado } from '../../domain/auth/auth.types';

export interface AuthenticatedRequest extends Request {
  user?: UsuarioAutenticado;
}
