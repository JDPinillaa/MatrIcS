import { cx } from '../../lib/cx'
import { useBackendHealth } from '../../hooks/use-backend-health'
import type { BackendHealthStatus } from '../../hooks/use-backend-health'

const STATUS_PRESENTATION: Record<BackendHealthStatus, { label: string; dot: string }> = {
  checking: { label: 'Verificando backend…', dot: 'bg-ink-subtle' },
  online: { label: 'Backend conectado', dot: 'bg-barrier-open' },
  degraded: { label: 'Backend con fallas', dot: 'bg-barrier-full' },
  offline: { label: 'Backend sin conexión', dot: 'bg-barrier-closed' },
}

/**
 * Compact connectivity indicator. It doubles as living proof of two DoD criteria:
 * the API base URL comes from the environment, and an unreachable backend is
 * reported instead of breaking the screen.
 */
export function BackendStatusBadge() {
  const { health, refresh } = useBackendHealth()
  const presentation = STATUS_PRESENTATION[health.status]

  return (
    <div className="flex items-center gap-2">
      <span
        role="status"
        aria-live="polite"
        title={health.detail}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted"
      >
        <span aria-hidden="true" className={cx('h-2 w-2 rounded-full', presentation.dot)} />
        {presentation.label}
      </span>
      <button
        type="button"
        onClick={refresh}
        className="rounded-control p-1.5 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
        aria-label="Volver a verificar la conexión con el backend"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 10a6 6 0 11-1.8-4.3" strokeLinecap="round" />
          <path d="M16 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
