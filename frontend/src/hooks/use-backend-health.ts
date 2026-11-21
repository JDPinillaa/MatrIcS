import { useCallback, useEffect, useState } from 'react'
import { checkHealth } from '../api/health-api'
import { isApiError } from '../lib/api-error'

export type BackendHealthStatus = 'checking' | 'online' | 'degraded' | 'offline'

export type BackendHealth = {
  status: BackendHealthStatus
  detail?: string
  checkedAt?: Date
}

const POLL_INTERVAL_MS = 30_000

/**
 * Probes `/health` so the shell can tell the operator whether the backend is
 * reachable. A failure here is informational: it never blocks the UI.
 */
export function useBackendHealth(intervalMs: number = POLL_INTERVAL_MS) {
  const [health, setHealth] = useState<BackendHealth>({ status: 'checking' })
  const [refreshToken, setRefreshToken] = useState(0)

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function probe(): Promise<void> {
      try {
        const response = await checkHealth(controller.signal)
        if (cancelled) {
          return
        }
        setHealth(
          response.database === 'connected'
            ? { status: 'online', checkedAt: new Date() }
            : {
                status: 'degraded',
                detail: 'El servidor responde, pero la base de datos no está conectada.',
                checkedAt: new Date(),
              },
        )
      } catch (error) {
        if (cancelled) {
          return
        }
        if (isApiError(error) && error.kind === 'aborted') {
          return
        }
        setHealth({
          status: 'offline',
          detail: isApiError(error) ? error.userMessage : undefined,
          checkedAt: new Date(),
        })
      }
    }

    void probe()
    const timer = window.setInterval(() => {
      void probe()
    }, intervalMs)

    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(timer)
    }
  }, [intervalMs, refreshToken])

  return { health, refresh }
}
