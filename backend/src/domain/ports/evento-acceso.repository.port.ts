import type {
  AccessEventType,
  CreateEventoAccesoInput,
  EventoAccesoRecord,
} from '../access/access.types';

export const EVENTO_ACCESO_REPOSITORY_PORT = Symbol(
  'EVENTO_ACCESO_REPOSITORY_PORT',
);

export interface EventoAccesoQueryFilters {
  placa?: string;
  fecha?: string;
  tipoEvento?: AccessEventType;
  lecturaManual?: boolean;
}

/**
 * Puerto segregado para persistir y consultar eventos de acceso en carril de entrada/salida (ISP + DIP).
 */
export interface IEventoAccesoRepository {
  create(input: CreateEventoAccesoInput): Promise<EventoAccesoRecord>;
  findMany?(filters: EventoAccesoQueryFilters): Promise<EventoAccesoRecord[]>;
}
