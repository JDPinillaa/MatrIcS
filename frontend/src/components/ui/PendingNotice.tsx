import type { ReactNode } from 'react'
import { Card } from './Card'

type PendingNoticeProps = {
  title: string
  description: ReactNode
  items?: readonly string[]
}

/**
 * Honest placeholder for a routed view whose feature is not implemented yet.
 * The route, menu entry and layout already work; only the feature is pending.
 */
export function PendingNotice({ title, description, items }: PendingNoticeProps) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
        >
          i
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
          {items && items.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
