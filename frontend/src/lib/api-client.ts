import { env } from '../config/env'
import { getAccessToken } from '../auth/session-store'
import { ApiError } from './api-error'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryParams = Record<string, string | number | boolean | undefined | null>

export type RequestOptions = {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  query?: QueryParams
  signal?: AbortSignal
  timeoutMs?: number
  /** Set to false for public endpoints (login, health). Defaults to true. */
  auth?: boolean
}

type AbortScope = {
  signal: AbortSignal
  wasTimeout: () => boolean
  wasCallerAbort: () => boolean
  dispose: () => void
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = env.apiBaseUrl
  const pathPart = path.startsWith('/') ? path : `/${path}`
  const search = new URLSearchParams()

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        search.set(key, String(value))
      }
    }
  }

  const qs = search.toString()
  return qs ? `${base}${pathPart}?${qs}` : `${base}${pathPart}`
}

/**
 * A request needs two abort sources: the caller (component unmount, navigation)
 * and the timeout. They are merged into a single signal here so `fetch` gets one.
 */
function createAbortScope(timeoutMs: number, callerSignal?: AbortSignal): AbortScope {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const onCallerAbort = () => controller.abort()

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort()
    } else {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true })
    }
  }

  return {
    signal: controller.signal,
    wasTimeout: () => timedOut,
    wasCallerAbort: () => Boolean(callerSignal?.aborted),
    dispose: () => {
      clearTimeout(timer)
      callerSignal?.removeEventListener('abort', onCallerAbort)
    },
  }
}

function isAbortLike(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError')
  )
}

async function parseResponse<T>(response: Response, url: string): Promise<T> {
  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  let raw = ''
  try {
    raw = await response.text()
  } catch (error) {
    throw new ApiError({ kind: 'network', url, cause: error })
  }

  let payload: unknown
  if (raw.length > 0) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = raw
    }
  }

  if (!response.ok) {
    throw new ApiError({ kind: 'http', status: response.status, payload, url })
  }

  return payload as T
}

/**
 * Centralized HTTP client. Every backend call goes through here so that:
 *  - the base URL comes from the environment,
 *  - the session token is attached in exactly one place,
 *  - network, timeout and HTTP failures are normalized into `ApiError`.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    query,
    signal: callerSignal,
    timeoutMs = env.apiTimeoutMs,
    auth = true,
  } = options

  const url = buildUrl(path, query)
  const scope = createAbortScope(timeoutMs, callerSignal)
  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers }

  const init: RequestInit = { method, headers: requestHeaders, signal: scope.signal }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  if (auth) {
    const token = getAccessToken()
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`
    }
  }

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (scope.wasTimeout()) {
      throw new ApiError({ kind: 'timeout', url, cause: error })
    }
    if (scope.wasCallerAbort() || isAbortLike(error)) {
      throw new ApiError({ kind: 'aborted', url, cause: error })
    }
    throw new ApiError({ kind: 'network', url, cause: error })
  } finally {
    scope.dispose()
  }

  return parseResponse<T>(response, url)
}

export const apiClient = {
  request,
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
