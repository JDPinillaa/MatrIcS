import { Link } from 'react-router'
import { ROUTES } from '../navigation/routes'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">Error 404</p>
      <h1 className="text-2xl font-semibold text-ink">Esta vista no existe</h1>
      <p className="max-w-md text-sm text-ink-muted">
        La ruta solicitada no corresponde a ninguna pantalla del sistema.
      </p>
      <Link
        to={ROUTES.lane}
        className="mt-2 rounded-control bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
      >
        Ir al carril
      </Link>
    </div>
  )
}
