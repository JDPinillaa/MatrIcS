import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type CardProps = ComponentPropsWithoutRef<'section'>

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <section
      className={cx('rounded-card border border-line bg-surface-raised p-5 shadow-card', className)}
      {...rest}
    >
      {children}
    </section>
  )
}

type CardHeaderProps = {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
