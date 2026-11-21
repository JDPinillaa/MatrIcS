import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { login } from '../api/auth-api'
import {
  DEMO_ACCESS_ENABLED,
  createDemoSession,
  isDemoCredentials,
} from '../auth/demo-access'
import { getLogoutReason, setSession } from '../auth/session-store'
import { useSession } from '../auth/use-session'
import { useToast } from '../components/feedback/toast-context'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { isApiError } from '../lib/api-error'
import { ROUTES } from '../navigation/routes'

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      if (DEMO_ACCESS_ENABLED && isDemoCredentials(email, password)) {
        setSession(createDemoSession())
        notify({
          title: 'Acceso de demostración',
          description: 'Sesión local, sin backend. Solo disponible en desarrollo.',
          variant: 'info',
        })
        navigate(redirectTarget, { replace: true })
        return
      }

      const response = await login({ email: email.trim(), password })
      setSession({ accessToken: response.accessToken, user: response.usuario })
      notify({
        title: 'Sesión iniciada',
        description: `Bienvenido, ${response.usuario.nombreCompleto}.`,
        variant: 'success',
      })
      navigate(redirectTarget, { replace: true })
    } catch (cause) {
      const message = isApiError(cause) ? cause.userMessage : 'Credenciales inválidas'
      setError(message)
      notify({ title: 'No se pudo iniciar sesión', description: message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-muted px-6 py-10 lg:p-24">
      <div className="mx-auto flex w-full max-w-[1248px] flex-col items-center gap-12 lg:flex-row lg:gap-32">
        <div className="flex w-full flex-1 flex-col items-start gap-8">
          <img
            src="/brand/matrics-logo.png"
            alt="MatrIcS"
            width={900}
            height={320}
            className="h-auto w-full max-w-[435px]"
          />
          <p className="text-2xl leading-[58px] font-semibold text-ink">
            Tu sistema de parqueadero automatizado
          </p>
        </div>

        <div className="flex w-full max-w-[480px] shrink-0 flex-col items-start gap-6">
          <div className="flex w-full flex-col gap-7 rounded-[16px] border border-line bg-surface p-8 sm:p-[41px]">
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] leading-[36px] font-semibold tracking-[-0.18px] text-ink">
                Iniciar sesión
              </h1>
              <p className="text-sm leading-5 text-ink-muted">
                Ingresa con las credenciales asignadas a tu rol
                <br />
                (OPERADOR o ADMINISTRADOR).
              </p>
            </div>

            <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit} noValidate>
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
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                trailingSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                    aria-pressed={showPassword}
                    className="absolute right-2 flex size-7 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <img
                      src="/icons/eye.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="block size-5"
                    />
                  </button>
                }
              />

              {sessionExpired && !error ? (
                <div
                  role="status"
                  className="flex w-full items-center gap-2 rounded-[4px] border-l-2 border-feedback-alert bg-feedback-alert-soft py-2 pr-3 pl-3.5 text-[13px] leading-[18px] font-semibold text-feedback-alert"
                >
                  <img
                    src="/icons/error-alert.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="block size-5 shrink-0"
                  />
                  <span>Tu sesión expiró. Inicia sesión nuevamente para continuar.</span>
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="flex w-full items-center gap-2 rounded-[4px] border-l-2 border-feedback-alert bg-feedback-alert-soft py-2 pr-3 pl-3.5 text-[13px] leading-[18px] font-semibold text-feedback-alert"
                >
                  <img
                    src="/icons/error-alert.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="block size-5 shrink-0"
                  />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-10 w-full px-4 py-3.5 text-base leading-5"
              >
                {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </Button>

              <p className="text-center text-xs leading-4 text-ink-muted">
                ¿Problemas para ingresar? Contacta
                <br />
                al administrador de la sede.
              </p>
            </form>
          </div>

          <p className="w-full text-center text-xs leading-4 text-ink-muted">
            MatrIcS v1.0 · Sistema de parqueadero automatizado
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
