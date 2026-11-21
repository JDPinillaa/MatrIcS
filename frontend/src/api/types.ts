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
