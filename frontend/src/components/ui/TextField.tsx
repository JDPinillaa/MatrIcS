import { useId } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type TextFieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string
  hint?: string
  error?: string
  trailingSlot?: ReactNode
}

export function TextField({
  label,
  hint,
  error,
  trailingSlot,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('flex w-full flex-col gap-1', className)}>
      <label
        htmlFor={inputId}
        className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
      >
        {label}
      </label>
      <div className="relative flex w-full items-center">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            'h-12 w-full rounded-control border bg-surface py-[11.5px] pl-[13px] text-sm text-ink placeholder:text-ink-subtle',
            trailingSlot ? 'pr-[33px]' : 'pr-[13px]',
            error ? 'border-feedback-error-line' : 'border-line-strong',
          )}
          {...rest}
        />
        {trailingSlot}
      </div>
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
