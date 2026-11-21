import type { ComponentPropsWithoutRef } from 'react'
import { cx } from '../../lib/cx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90 active:bg-ink disabled:bg-ink-muted',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
}

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', type = 'button', className, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    />
  )
}
