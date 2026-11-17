import { cx } from '../../lib/cx'
import type { VehicleType } from '../../api/types'
import {
  BADGE_ICON,
  BARRIER_BADGE_CLASSES,
  BARRIER_TONE_VAR,
  getBarrierPresentation,
} from './barrier-state'
import type { BarrierState } from './barrier-state'

export type BarrierIndicatorProps = {
  state: BarrierState
  /** Explains *why* the lane is in that state. Falls back to the default reason. */
  reason?: string
  vehicleType?: VehicleType
  className?: string
}

const VEHICLE_LABEL: Record<VehicleType, string> = {
  CARRO: 'Carro',
  MOTO: 'Moto',
}

/**
 * Reusable representation of the simulated physical barrier and the lane state.
 *
 * The DoD asks for ABIERTA (green), CERRADA (red) and LLENO (alert). Those colors
 * are never the only signal: the badge always shows an icon + the state name, and
 * the reason is always rendered as text.
 */
export function BarrierIndicator({ state, reason, vehicleType, className }: BarrierIndicatorProps) {
  const presentation = getBarrierPresentation(state)
  const armColor = BARRIER_TONE_VAR[presentation.tone]
  const explanation = reason?.trim() || presentation.defaultReason

  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Barrera física simulada</p>
          {vehicleType ? (
            <p className="text-xs text-ink-muted">Carril de {VEHICLE_LABEL[vehicleType].toLowerCase()}</p>
          ) : null}
        </div>
        <span
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
            BARRIER_BADGE_CLASSES[presentation.tone],
          )}
        >
          <BadgeIcon state={state} />
          {presentation.label}
        </span>
      </div>

      <div className="rounded-control border border-line bg-surface-muted">
        <svg
          viewBox="0 0 260 130"
          role="img"
          aria-hidden="true"
          className="h-32 w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Lane surface */}
          <line x1="0" y1="102" x2="260" y2="102" stroke="var(--color-line)" strokeWidth="2" />
          <line
            x1="150"
            y1="102"
            x2="230"
            y2="102"
            stroke="var(--color-line-strong)"
            strokeWidth="2"
            strokeDasharray="10 8"
          />

          {/* Post + arm, rotating around the post top */}
          <g transform="translate(56 100)">
            <rect x="-7" y="-30" width="14" height="30" rx="4" fill="var(--color-line-strong)" />
            <rect x="-11" y="-4" width="22" height="6" rx="3" fill="var(--color-line-strong)" />
            <g
              style={{
                transform: `rotate(${presentation.armAngle}deg)`,
                transformOrigin: '0px 0px',
                transition: 'transform 500ms ease',
              }}
            >
              <rect x="0" y="-7" width="158" height="9" rx="4.5" fill={armColor} />
              <rect x="120" y="-7" width="38" height="9" fill="var(--color-surface)" opacity="0.85" />
              <rect x="128" y="-7" width="10" height="9" fill={armColor} opacity="0.55" />
            </g>
            <circle cx="0" cy="0" r="4.5" fill={armColor} />
          </g>
        </svg>
      </div>

      {/* Live region: state changes are announced, not just painted. */}
      <p role="status" aria-live="polite" className="flex gap-2 text-sm text-ink-muted">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="mt-0.5 h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6.2v4.6M10 13.4v.4" strokeLinecap="round" />
        </svg>
        <span>{explanation}</span>
      </p>
    </div>
  )
}

function BadgeIcon({ state }: { state: BarrierState }) {
  const kind = BADGE_ICON[state]
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      {kind === 'open' ? <path d="M5 13l4-4 3 3 3-5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {kind === 'closed' ? <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /> : null}
      {kind === 'alert' ? (
        <>
          <path d="M10 3.5l7 12.5H3z" strokeLinejoin="round" />
          <path d="M10 8v3.2M10 13.6v.4" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}
