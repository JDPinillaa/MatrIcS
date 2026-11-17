import { useSyncExternalStore } from 'react'
import { getSession, subscribeToSession } from './session-store'
import type { Session } from './session-store'

const getServerSnapshot = (): Session | null => null

/** Reads the session reactively; re-renders when it is set or cleared. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribeToSession, getSession, getServerSnapshot)
}
