import { apiClient } from '../lib/api-client'
import type { LoginRequest, LoginResponse, UsuarioPerfil } from './types'

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', credentials, { auth: false })
}

export function fetchProfile(signal?: AbortSignal): Promise<UsuarioPerfil> {
  return apiClient.get<UsuarioPerfil>('/auth/perfil', { signal })
}
