import { apiClient } from '../lib/api-client'
import type { HealthResponse } from './types'

/** Short timeout: a health probe must fail fast, never hang the UI. */
const HEALTH_TIMEOUT_MS = 4_000

export function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiClient.get<HealthResponse>('/health', {
    auth: false,
    signal,
    timeoutMs: HEALTH_TIMEOUT_MS,
  })
}
