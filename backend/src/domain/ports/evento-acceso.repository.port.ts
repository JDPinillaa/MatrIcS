import type {
  CreateEventoAccesoInput,
  EventoAccesoRecord,
} from '../access/access.types';

export const EVENTO_ACCESO_REPOSITORY_PORT = Symbol(
  'EVENTO_ACCESO_REPOSITORY_PORT',
);

/**
 * Puerto segregado para persistir eventos de acceso en carril de entrada/salida (ISP + DIP).
 */
export interface IEventoAccesoRepository {
  create(input: CreateEventoAccesoInput): Promise<EventoAccesoRecord>;
}
