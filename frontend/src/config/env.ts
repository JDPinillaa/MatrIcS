const DEFAULT_BASE_URL = 'http://localhost:3000'
const DEFAULT_TIMEOUT_MS = 8_000

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    return DEFAULT_BASE_URL
  }
  return trimmed.replace(/\/+$/, '')
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

/**
 * Environment configuration resolved once at module load.
 * Values come from Vite env files (`.env.example` documents the contract).
 */
export const env = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  apiTimeoutMs: parseTimeout(import.meta.env.VITE_API_TIMEOUT_MS),
  isApiBaseUrlFromEnv: Boolean((import.meta.env.VITE_API_BASE_URL ?? '').trim()),
} as const
