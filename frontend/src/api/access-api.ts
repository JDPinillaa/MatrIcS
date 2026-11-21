import { apiClient } from '../lib/api-client'
import type {
  RegistroAccesoRequest,
  ResultadoIngresoResponse,
  ResultadoSalidaResponse,
  ResultadoValidacionManualResponse,
  SedeConfigDto,
  ValidacionManualRequest,
} from './types'

export function registerEntry(
  payload: RegistroAccesoRequest,
): Promise<ResultadoIngresoResponse> {
  return apiClient.post<ResultadoIngresoResponse>('/accesos/ingreso', payload)
}

export function registerExit(
  payload: RegistroAccesoRequest,
): Promise<ResultadoSalidaResponse> {
  return apiClient.post<ResultadoSalidaResponse>('/accesos/salida', payload)
}

export function validateManualAccess(
  payload: ValidacionManualRequest,
): Promise<ResultadoValidacionManualResponse> {
  return apiClient.post<ResultadoValidacionManualResponse>(
    '/accesos/validacion-manual',
    payload,
  )
}

export function getSedeConfidenceThreshold(
  sedeId: number,
  signal?: AbortSignal,
): Promise<SedeConfigDto> {
  return apiClient.get<SedeConfigDto>(`/sedes/${sedeId}/umbral-confianza`, {
    signal,
  })
}

export function updateSedeConfidenceThreshold(
  sedeId: number,
  umbralConfianza: number,
): Promise<SedeConfigDto> {
  return apiClient.put<SedeConfigDto>(`/sedes/${sedeId}/umbral-confianza`, {
    umbralConfianza,
  })
}
