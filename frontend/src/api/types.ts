/**
 * Types mirrored from `backend/openapi.yaml`.
 * Keep them in sync with the OpenAPI contract when the backend changes.
 */

export type VehicleType = 'CARRO' | 'MOTO'

export type UserRole = 'OPERADOR' | 'ADMINISTRADOR'

export type HealthResponse = {
  status: string
  service: string
  timestamp: string
  database: 'connected' | 'disconnected'
}

export type LoginRequest = {
  email: string
  password: string
}

export type UsuarioPerfil = {
  id: number
  nombreCompleto: string
  email: string
  rol: UserRole
  activo: boolean
}

export type LoginResponse = {
  accessToken: string
  usuario: UsuarioPerfil
}

export type AccessEventType = 'ENTRADA' | 'SALIDA'

export type BarrierResult = 'ABIERTA' | 'CERRADA' | 'LLENO'

export type ManualValidationAction = 'CONFIRMAR' | 'DESCARTAR'

export type SedeConfigDto = {
  id: number
  nombre: string
  umbralConfianza: number
  activa: boolean
}

export type EventoAccesoDto = {
  id: number
  sedeId: number
  tipoVehiculo: VehicleType
  usuarioId: number | null
  placa: string
  tipoEvento: AccessEventType
  confianzaLectura: number
  lecturaManual: boolean
  fechaHora: string
  resultadoBarrera: BarrierResult
  motivo: string | null
}

export type CobroSummaryDto = {
  id: number
  sedeId: number
  placa: string
  tipoVehiculo: VehicleType
  fechaDiaOperativo: string
  franjaAplicada: string
  valorAplicado: number
  estado: 'PENDIENTE' | 'PAGADO' | 'EXENTO' | 'ANULADO'
  generadoEn: string
  pagadoEn: string | null
}

export type RegistroAccesoRequest = {
  sedeId: number
  placa: string
  confianzaLectura: number
}

export type ResultadoIngresoResponse = {
  requiereValidacionManual: boolean
  resultadoBarrera: BarrierResult
  motivo: string
  evento: EventoAccesoDto | null
  cobro: CobroSummaryDto | null
}

export type ResultadoSalidaResponse = {
  requiereValidacionManual: boolean
  resultadoBarrera: BarrierResult
  motivo: string
  evento: EventoAccesoDto | null
}

export type ValidacionManualRequest = {
  sedeId: number
  tipoEvento: AccessEventType
  accion: ManualValidationAction
  placaCorregida?: string
  confianzaOriginal?: number
  usuarioId?: number
}

export type ResultadoValidacionManualResponse = {
  descartado: boolean
  resultadoBarrera: BarrierResult
  motivo: string
  evento: EventoAccesoDto | null
  cobro: CobroSummaryDto | null
}
