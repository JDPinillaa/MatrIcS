import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { clearSession } from '../../auth/session-store'
import { useSession } from '../../auth/use-session'
import { useToast } from '../feedback/toast-context'
import { cx } from '../../lib/cx'
import { MAIN_NAV, ROUTES } from '../../navigation/routes'
import { BackendStatusNotice } from './BackendStatusNotice'

const ICON_PROPS = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-[18px] w-[18px]',
} as const

const NAV_ICONS: Record<string, ReactNode> = {
  [ROUTES.lane]: (
    <svg aria-hidden="true" {...ICON_PROPS}>
      <path d="M3 13.5h14M4.6 13.5V10l1.9-4.2h7l1.9 4.2v3.5" />
      <circle cx="6.6" cy="15.2" r="1.4" />
      <circle cx="13.4" cy="15.2" r="1.4" />
    </svg>
  ),
  [ROUTES.cashier]: (
    <svg aria-hidden="true" {...ICON_PROPS}>
      <rect x="2.2" y="5.6" width="15.6" height="9.4" rx="1.6" />
      <path d="M2.2 8.9h15.6" />
    </svg>
  ),
  [ROUTES.administration]: (
    <svg aria-hidden="true" {...ICON_PROPS}>
      <path d="M3 6h14M3 14h14" />
      <circle cx="7.5" cy="6" r="1.7" />
      <circle cx="12.5" cy="14" r="1.7" />
    </svg>
  ),
  [ROUTES.queries]: (
    <svg aria-hidden="true" {...ICON_PROPS}>
      <circle cx="9" cy="9" r="5.2" />
      <path d="M12.8 12.8L17 17" />
    </svg>
  ),
}

const LOGOUT_ICON = (
  <svg aria-hidden="true" {...ICON_PROPS}>
    <path d="M12.5 6.5V4.2H3.5v11.6h9V13.5" />
    <path d="M8.6 10h8.2M14.2 7.2L17 10l-2.8 2.8" />
  </svg>
)

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cx(
    'flex h-10 items-center gap-2 rounded-control px-3 text-sm transition-colors',
    isActive
      ? 'bg-surface-sunken font-semibold text-ink'
      : 'font-medium text-ink-muted hover:bg-surface-muted hover:text-ink',
  )

/** Shell shared by every operational view: brand header, main menu + content. */
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
    <div className="flex min-h-full flex-col bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-6 py-3 sm:px-8">
          <div className="min-w-0">
            <img
              src="/brand/matrics-logo.png"
              alt="MatrIcS"
              width={900}
              height={320}
              className="h-[53px] w-auto"
            />
            <p className="mt-1 text-[13px] leading-4 text-ink-muted">Parqueadero automatizado</p>
          </div>

          {session ? (
            <div className="flex shrink-0 items-center gap-5">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-ink">{session.user.nombreCompleto}</p>
                <p className="text-[13px] leading-4 text-ink-muted">
                  {session.user.rol} · {session.user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-10 items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
              >
                {LOGOUT_ICON}
                Cerrar sesión
              </button>
            </div>
          ) : (
            <NavLink to={ROUTES.login} className="text-sm font-semibold text-ink">
              Iniciar sesión
            </NavLink>
          )}
        </div>
      </header>

      <nav aria-label="Menú principal" className="border-b border-line">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-6 px-6 sm:px-8">
          <p className="hidden text-xs font-semibold tracking-wide text-ink-muted uppercase lg:block">
            Panel operativo
          </p>
          <ul className="ml-auto flex items-center gap-2 overflow-x-auto py-3">
            {MAIN_NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink to={item.to} className={navLinkClass}>
                  {NAV_ICONS[item.to]}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <BackendStatusNotice />

      <main className="flex-1 px-6 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
