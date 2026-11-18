import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getLogoutReason, getSession, setSession } from './session-store'
import type { UsuarioPerfil } from '../api/types'

const USER: UsuarioPerfil = {
  id: 1,
  nombreCompleto: 'Ana Administradora',
  email: 'admin@parqueadero.com',
  rol: 'ADMINISTRADOR',
  activo: true,
}

describe('session store', () => {
  beforeEach(() => {
    clearSession()
  })

  it('remembers why the session ended when it expired', () => {
    setSession({ accessToken: 'token-123', user: USER })

    clearSession('expired')

    expect(getSession()).toBeNull()
    expect(getLogoutReason()).toBe('expired')
  })

  it('marks a manual logout as manual', () => {
    setSession({ accessToken: 'token-123', user: USER })

    clearSession()

    expect(getLogoutReason()).toBe('manual')
  })

  it('does not report an expired session when there was nothing to expire', () => {
    clearSession('expired')

    expect(getLogoutReason()).toBeNull()
  })

  it('forgets the previous reason when a new session starts', () => {
    clearSession('expired')

    setSession({ accessToken: 'token-456', user: USER })

    expect(getLogoutReason()).toBeNull()
    expect(getSession()?.accessToken).toBe('token-456')
  })
})
