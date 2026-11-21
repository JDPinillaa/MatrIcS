/** Failure categories the UI can react to without inspecting raw network details. */
export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'invalid-response'

export type ApiErrorInit = {
  kind: ApiErrorKind
  url?: string
  status?: number
  payload?: unknown
  message?: string
  cause?: unknown
}

const KIND_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'No se pudo contactar al servidor. Verifica que el backend esté en ejecución.',
  timeout: 'El servidor tardó demasiado en responder. Intenta de nuevo en unos segundos.',
  aborted: 'La solicitud fue cancelada.',
  http: 'El servidor respondió con un error.',
  'invalid-response': 'El servidor devolvió una respuesta que no se pudo interpretar.',
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud tiene datos inválidos. Revisa la información e intenta de nuevo.',
  401: 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No se encontró el recurso solicitado.',
  409: 'La operación entra en conflicto con el estado actual del sistema.',
  422: 'Los datos enviados no cumplen las reglas del negocio.',
  500: 'Ocurrió un error interno en el servidor.',
  503: 'El servidor no está disponible en este momento.',
}

/**
 * Single error type produced by the HTTP client, so every caller knows what
 * happened without parsing messages. `userMessage` is the copy meant for the UI;
 * it lives here so the wording has exactly one owner.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly url?: string
  readonly status?: number
  readonly payload?: unknown

  constructor(init: ApiErrorInit) {
    super(init.message ?? KIND_MESSAGES[init.kind], { cause: init.cause })
    this.name = 'ApiError'
    this.kind = init.kind
    this.url = init.url
    this.status = init.status
    this.payload = init.payload
  }

  /** True when the backend could not be reached at all (offline, DNS, frame blocked). */
  get isConnectivityFailure(): boolean {
    return this.kind === 'network' || this.kind === 'timeout'
  }

  get userMessage(): string {
    if (this.kind === 'http') {
      const fromServer = extractServerMessage(this.payload)
      if (fromServer) {
        return fromServer
      }
      return STATUS_MESSAGES[this.status ?? 0] ?? KIND_MESSAGES.http
    }
    return KIND_MESSAGES[this.kind]
  }
}

type ServerPayload = {
  message?: unknown
  error?: unknown
}

/** NestJS returns `{ message: string | string[] }`; be tolerant with the shape. */
export function extractServerMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const { message, error } = payload as ServerPayload

  if (Array.isArray(message)) {
    const parts = message.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    return parts.length > 0 ? parts.join('. ') : null
  }

  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim()
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim()
  }

  return null
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
