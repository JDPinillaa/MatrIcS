import type { UsuarioPerfil } from '../api/types'

const STORAGE_KEY = 'matrics.session'

export type Session = {
  accessToken: string
  user: UsuarioPerfil
}

/**
 * Single owner of the session credentials.
 *
 * `sessionStorage` is intentional: a kiosk/operator terminal should not keep a
 * JWT alive after the tab is closed. If the project later moves to httpOnly
 * cookies, only this module and `api-client` change.
 */
let currentSession: Session | null = readFromStorage()
const listeners = new Set<() => void>()

function readFromStorage(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<Session> | null
    if (!parsed || typeof parsed.accessToken !== 'string' || parsed.accessToken.length === 0) {
      return null
    }
    if (!parsed.user || typeof parsed.user !== 'object') {
      return null
    }
    return { accessToken: parsed.accessToken, user: parsed.user }
  } catch {
    return null
  }
}

function persist(): void {
  try {
    if (currentSession) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode); the in-memory session still works.
  }
}

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getSession(): Session | null {
  return currentSession
}

export function getAccessToken(): string | null {
  return currentSession?.accessToken ?? null
}

export function setSession(session: Session): void {
  currentSession = session
  persist()
  emit()
}

export function clearSession(): void {
  currentSession = null
  persist()
  emit()
}

/** Required by `useSyncExternalStore`. */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
