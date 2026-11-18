import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { login } from '../api/auth-api'
import { getLogoutReason, setSession } from '../auth/session-store'
import { useSession } from '../auth/use-session'
import { useToast } from '../components/feedback/toast-context'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { env } from '../config/env'
import { isApiError } from '../lib/api-error'
import { ROUTES } from '../navigation/routes'

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTarget = resolveRedirectTarget(location.state)
  const sessionExpired = getLogoutReason() === 'expired'

  if (session) {
    return <Navigate to={redirectTarget} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await login({ email: email.trim(), password })
      setSession({ accessToken: response.accessToken, user: response.usuario })
      notify({
        title: 'Sesión iniciada',
        description: `Bienvenido, ${response.usuario.nombreCompleto}.`,
        variant: 'success',
      })
      navigate(redirectTarget, { replace: true })
    } catch (cause) {
      const message = isApiError(cause) ? cause.userMessage : 'No se pudo iniciar sesión.'
      setError(message)
      notify({ title: 'No se pudo iniciar sesión', description: message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-control bg-brand-500 text-base font-bold text-white"
          >
            M
          </span>
          <div>
            <p className="text-base font-semibold text-ink">MatrIcS</p>
            <p className="text-xs text-ink-muted">Sistema de parqueadero automatizado</p>
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ingresa con las credenciales asignadas a tu rol (OPERADOR o ADMINISTRADOR).
          </p>

          <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Correo electrónico"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operador@parqueadero.com"
            />
            <TextField
              label="Contraseña"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {sessionExpired && !error ? (
              <p role="status" className="rounded-control bg-barrier-full-soft p-3 text-sm text-ink">
                Tu sesión expiró. Inicia sesión nuevamente para continuar.
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-control bg-feedback-error-soft p-3 text-sm text-ink">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

          <p className="mt-4 text-xs text-ink-subtle">
            API: <code className="font-mono">{env.apiBaseUrl}</code>
            {env.isApiBaseUrlFromEnv ? '' : ' (valor por defecto; define VITE_API_BASE_URL)'}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Only same-origin absolute paths are accepted, so router state coming from a
 * link cannot turn the post-login redirect into an open redirect.
 */
function resolveRedirectTarget(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state) {
    const from = (state as { from?: unknown }).from
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
      return from
    }
  }
  return ROUTES.lane
}
