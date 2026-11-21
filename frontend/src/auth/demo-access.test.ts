import { describe, expect, it } from 'vitest'
import {
  DEMO_ACCESS_ENABLED,
  createDemoSession,
  getDemoCredentials,
  isDemoCredentials,
} from './demo-access'

describe('demo access', () => {
  it('is enabled while developing', () => {
    expect(DEMO_ACCESS_ENABLED).toBe(import.meta.env.DEV)
  })

  it('accepts the demo credentials', () => {
    const credentials = getDemoCredentials()

    expect(isDemoCredentials(credentials.email, credentials.password)).toBe(true)
  })

  it('ignores surrounding spaces and letter case in the email', () => {
    const credentials = getDemoCredentials()

    expect(isDemoCredentials(`  ${credentials.email.toUpperCase()} `, credentials.password)).toBe(
      true,
    )
  })

  it('rejects a wrong password', () => {
    const credentials = getDemoCredentials()

    expect(isDemoCredentials(credentials.email, 'otra-clave')).toBe(false)
  })

  it('rejects an unknown user', () => {
    const credentials = getDemoCredentials()

    expect(isDemoCredentials('otro@matrics.local', credentials.password)).toBe(false)
  })

  it('builds a session that the guard accepts', () => {
    const credentials = getDemoCredentials()
    const session = createDemoSession()

    expect(session.accessToken.length).toBeGreaterThan(0)
    expect(session.user.email).toBe(credentials.email)
    expect(session.user.rol).toBe('ADMINISTRADOR')
  })
})
