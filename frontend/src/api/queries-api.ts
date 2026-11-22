import { apiClient } from '../lib/api-client'
import type {
  AccessEventType,
  CobroSummaryDto,
  EventoAccesoDto,
} from './types'

export type ChargeStatus = CobroSummaryDto['estado']

export type ListEventosParams = {
  placa?: string
  fecha?: string
  tipoEvento?: AccessEventType
  lecturaManual?: boolean
}

export type ListCobrosParams = {
  placa?: string
  fechaDiaOperativo?: string
  estado?: ChargeStatus
}

export function listAccessEvents(
  params: ListEventosParams = {},
  signal?: AbortSignal,
): Promise<EventoAccesoDto[]> {
  return apiClient.get<EventoAccesoDto[]>('/eventos', {
    query: {
      placa: params.placa || undefined,
      fecha: params.fecha || undefined,
      tipoEvento: params.tipoEvento || undefined,
      lecturaManual:
        typeof params.lecturaManual === 'boolean'
          ? params.lecturaManual
          : undefined,
    },
    signal,
  })
}

export function listCharges(
  params: ListCobrosParams = {},
  signal?: AbortSignal,
): Promise<CobroSummaryDto[]> {
  return apiClient.get<CobroSummaryDto[]>('/cobros', {
    query: {
      placa: params.placa || undefined,
      fechaDiaOperativo: params.fechaDiaOperativo || undefined,
      estado: params.estado || undefined,
    },
    signal,
  })
}
