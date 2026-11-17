import { NavLink, Outlet, useNavigate } from 'react-router'
import { clearSession } from '../../auth/session-store'
import { useSession } from '../../auth/use-session'
import { useToast } from '../feedback/toast-context'
import { cx } from '../../lib/cx'
import { MAIN_NAV, ROUTES } from '../../navigation/routes'
import { BackendStatusBadge } from './BackendStatusBadge'

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cx(
    'block rounded-control px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-brand-100 font-semibold text-brand-700'
      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  )

/** Shell shared by every operational view: main menu + connectivity + content. */
export function AppLayout() {
  const session = useSession()
  const navigate = useNavigate()
  const notify = useToast()

  const handleLogout = (): void => {
    clearSession()
    notify({ title: 'Sesión cerrada', description: 'Las credenciales se descartaron.', variant: 'info' })
    navigate(ROUTES.login)
  }

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="flex flex-col gap-6 border-b border-line bg-surface px-4 py-5 lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-500 text-sm font-bold text-white"
          >
            M
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">MatrIcS</p>
            <p className="text-xs text-ink-muted">Parqueadero automatizado</p>
          </div>
        </div>

        <nav aria-label="Menú principal">
          <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {MAIN_NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
          {session ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{session.user.nombreCompleto}</p>
              <p className="truncate text-xs text-ink-muted">
                {session.user.rol} · {session.user.email}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <NavLink to={ROUTES.login} className={navLinkClass}>
              Iniciar sesión
            </NavLink>
          )}

          <NavLink
            to={ROUTES.barrierDemo}
            className="text-xs text-ink-subtle underline-offset-2 hover:text-ink-muted hover:underline"
          >
            Demo de la barrera simulada
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
          <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Panel operativo</p>
          <BackendStatusBadge />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
