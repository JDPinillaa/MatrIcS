import type { UsuarioPerfil } from '../api/types'
import type { Session } from './session-store'

/**
 * TEMPORARY demo access, used to review the base views while the backend is not
 * running. It exists only to satisfy the DoD walkthrough and must be deleted
 * once the real login is used end to end.
 *
 * Safety: `import.meta.env.DEV` is replaced with the literal `false` by Vite at
 * build time, so every branch that uses demo access is dead code eliminated and
 * the credentials never reach a production bundle.
 *
 * To remove it: delete this file and `demo-access.test.ts`, then delete the
 * `DEMO_ACCESS_ENABLED` / `isDemoCredentials` / `createDemoSession` usages and
 * the hint block in `routes/LoginPage.tsx`.
 */
export const DEMO_ACCESS_ENABLED: boolean = import.meta.env.DEV

/**
 * The credentials live inside a function, not in a module-level literal, so the
 * bundler can drop them completely when the demo branch is dead code.
 */
export function getDemoCredentials(): { email: string; password: string } {
  return { email: 'demo@matrics.local', password: 'demo1234' }
}

function getDemoUser(): UsuarioPerfil {
  return {
    id: 0,
    nombreCompleto: 'Usuario de demostración',
    email: getDemoCredentials().email,
    rol: 'ADMINISTRADOR',
    activo: true,
  }
}

export function isDemoCredentials(email: string, password: string): boolean {
  const credentials = getDemoCredentials()
  return email.trim().toLowerCase() === credentials.email && password === credentials.password
}

/**
 * The token is a placeholder: any protected backend call will answer 401 and the
 * client will drop the session. That is fine for browsing placeholder views.
 */
export function createDemoSession(): Session {
  return { accessToken: 'demo-session-token', user: getDemoUser() }
}
