import { cx } from '../../lib/cx'
import { useBackendHealth } from '../../hooks/use-backend-health'

const TONE: Record<'degraded' | 'offline', string> = {
  degraded: 'border-barrier-full-soft bg-barrier-full-soft text-barrier-full',
  offline: 'border-barrier-closed-soft bg-barrier-closed-soft text-barrier-closed',
}

/**
 * Connectivity notice. The operational screens stay silent while the API is
 * healthy, so the shell matches the mockups; an unreachable backend surfaces
 * here as a controlled warning instead of a blank screen.
 */
export function BackendStatusNotice() {
  const { health, refresh } = useBackendHealth()

  if (health.status !== 'offline' && health.status !== 'degraded') {
    return null
  }

  const message =
    health.status === 'offline'
      ? 'Backend sin conexión'
      : 'Backend con fallas: la base de datos no responde'

  return (
    <div className="border-b border-line bg-surface px-6 py-2 sm:px-8">
      <div
        role="status"
        aria-live="polite"
        className={cx(
          'mx-auto flex w-full max-w-[1280px] items-center gap-3 rounded-control border px-3 py-2 text-xs font-medium',
          TONE[health.status],
        )}
      >
        <span className="min-w-0 flex-1">
          {message}
          {health.detail ? <span className="ml-2 font-normal opacity-80">{health.detail}</span> : null}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="shrink-0 font-semibold underline underline-offset-2"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
