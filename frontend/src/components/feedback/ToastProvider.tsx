import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { ToastContext } from './toast-context'
import type { Notify, ToastInput, ToastVariant } from './toast-context'

type ToastRecord = Required<Pick<ToastInput, 'title' | 'variant' | 'durationMs'>> &
  Pick<ToastInput, 'description'> & { id: number }

const DEFAULT_DURATION_MS = 6_000

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  error: 'border-feedback-error-line bg-feedback-error-soft',
  success: 'border-line-strong bg-surface',
  info: 'border-brand-300 bg-brand-100',
}

const VARIANT_DOT_CLASSES: Record<ToastVariant, string> = {
  error: 'bg-feedback-error',
  success: 'bg-feedback-success',
  info: 'bg-feedback-info',
}

let nextToastId = 0

type ToastItemProps = {
  toast: ToastRecord
  onDismiss: (id: number) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    if (toast.durationMs <= 0) {
      return
    }
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.durationMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [toast.id, toast.durationMs, onDismiss])

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={cx(
        'pointer-events-auto flex w-full items-start gap-3 rounded-card border p-4 shadow-card',
        VARIANT_CLASSES[toast.variant],
      )}
    >
      <span
        aria-hidden="true"
        className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', VARIANT_DOT_CLASSES[toast.variant])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.description ? <p className="mt-1 text-sm text-ink-muted">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-1 rounded-control p-1 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
        aria-label="Cerrar notificación"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Global notification layer. The DoD requires a *controlled* error notification,
 * so failures surface here while the rest of the screen stays usable.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback<Notify>((toast) => {
    const record: ToastRecord = {
      id: (nextToastId += 1),
      title: toast.title,
      description: toast.description,
      variant: toast.variant ?? 'info',
      durationMs: toast.durationMs ?? DEFAULT_DURATION_MS,
    }
    setToasts((current) => [...current, record])
  }, [])

  const value = useMemo(() => notify, [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="w-full max-w-sm">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
