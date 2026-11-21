import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './api-client'
import { ApiError } from './api-error'
import { clearSession, getLogoutReason, getSession, setSession } from '../auth/session-store'
import type { UsuarioPerfil } from '../api/types'

const USER: UsuarioPerfil = {
  id: 2,
  nombreCompleto: 'Carlos Operador',
  email: 'operador@parqueadero.com',
  rol: 'OPERADOR',
  activo: true,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) {
      return error
    }
    throw error
  }
  throw new Error('Se esperaba un ApiError y la promesa se resolvió')
}

describe('apiClient', () => {
  beforeEach(() => {
    clearSession()
  })

  afterEach(() => {
    clearSession()
    vi.unstubAllGlobals()
  })

  it('builds the URL from the configured base URL', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.get('/health')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/health')
  })

  it('attaches the session token as a bearer credential', async () => {
    setSession({ accessToken: 'token-123', user: USER })
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.get('/auth/perfil')

    const init = fetchMock.mock.calls[0]?.[1]
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-123')
  })

  it('omits the token for public endpoints', async () => {
    setSession({ accessToken: 'token-123', user: USER })
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.post('/auth/login', {}, { auth: false })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('normalizes an unreachable backend into a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await captureError(apiClient.get('/health'))

    expect(error.kind).toBe('network')
    expect(error.isConnectivityFailure).toBe(true)
    expect(error.userMessage).toContain('No se pudo contactar al servidor')
  })

  it('aborts a request that exceeds the timeout budget', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_input, init) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        })
      }),
    )

    const error = await captureError(apiClient.get('/health', { timeoutMs: 5 }))

    expect(error.kind).toBe('timeout')
    expect(error.isConnectivityFailure).toBe(true)
  })

  it('surfaces the backend message for HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Credenciales inválidas' }, 401)),
    )

    const error = await captureError(apiClient.post('/auth/login', {}, { auth: false }))

    expect(error.kind).toBe('http')
    expect(error.status).toBe(401)
    expect(error.userMessage).toBe('Credenciales inválidas')
    expect(error.isConnectivityFailure).toBe(false)
  })

  it('joins array messages returned by the global exception filter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ message: ['email must be an email', 'password too short'] }, 400),
      ),
    )

    const error = await captureError(apiClient.get('/auth/perfil'))

    expect(error.userMessage).toBe('email must be an email. password too short')
  })

  it('returns undefined for empty responses', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(apiClient.delete('/eventos/1')).resolves.toBeUndefined()
  })

  it('clears the session when an authenticated request returns 401', async () => {
    setSession({ accessToken: 'token-123', user: USER })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Token expirado' }, 401)),
    )

    const error = await captureError(apiClient.get('/auth/perfil'))

    expect(error.status).toBe(401)
    expect(getSession()).toBeNull()
    expect(getLogoutReason()).toBe('expired')
  })

  it('does not expire the session when a failed public login returns 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Credenciales inválidas' }, 401)),
    )

    await captureError(apiClient.post('/auth/login', {}, { auth: false }))

    expect(getLogoutReason()).toBeNull()
  })

  it('keeps the session when the failure is not an authentication problem', async () => {
    setSession({ accessToken: 'token-123', user: USER })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Conflicto' }, 409)),
    )

    await captureError(apiClient.get('/auth/perfil'))

    expect(getSession()).not.toBeNull()
    expect(getLogoutReason()).toBeNull()
  })
})
