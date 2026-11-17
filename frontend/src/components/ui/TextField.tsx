import { useId } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cx } from '../../lib/cx'

export type TextFieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string
  hint?: string
  error?: string
}

export function TextField({ label, hint, error, id, className, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'w-full rounded-control border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle',
          error ? 'border-feedback-error-line' : 'border-line-strong',
        )}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-feedback-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
