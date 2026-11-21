import { cx } from '../../lib/cx'
import type { VehicleType } from '../../api/types'
import {
  BARRIER_BADGE_CLASSES,
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

const STATUS_ICON_SRC: Record<BarrierState, string> = {
  ABIERTA: '/icons/status-open.svg',
  CERRADA: '/icons/status-closed.svg',
  LLENO: '/icons/status-full.svg',
}

/**
 * Reusable representation of the simulated physical barrier and the lane state,
 * aligned with the industrial cabinet and reflective boom from the Figma mockups.
 *
 * The DoD asks for ABIERTA (green), CERRADA (red/terracotta) and LLENO (alert).
 * Those colors are never the only signal: the badge always shows an icon + the
 * state name, and the reason is always rendered as text.
 */
export function BarrierIndicator({ state, reason, vehicleType, className }: BarrierIndicatorProps) {
  const presentation = getBarrierPresentation(state)
  const explanation = reason?.trim() || presentation.defaultReason
  const isOpen = state === 'ABIERTA'

  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm leading-5 font-medium text-ink">Barrera</p>
          {vehicleType ? (
            <p className="text-xs leading-4 text-ink-muted">
              Carril de {VEHICLE_LABEL[vehicleType].toLowerCase()}
            </p>
          ) : null}
        </div>
        <span
          className={cx(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] leading-[18px] font-semibold uppercase',
            BARRIER_BADGE_CLASSES[presentation.tone],
          )}
        >
          <img
            src={STATUS_ICON_SRC[state]}
            alt=""
            width={20}
            height={20}
            className="block size-5 shrink-0"
          />
          {presentation.label}
        </span>
      </div>

      <div className="flex w-full justify-center overflow-hidden rounded-control border border-line bg-surface-muted px-4">
        <div className="relative aspect-video w-full max-w-[420px]">
          {isOpen ? (
            <>
              <div className="absolute top-[94.74%] left-[6.38%] w-[87.25%]">
                <img
                  src="/barrier/lane-line.svg"
                  alt=""
                  width={469.591}
                  height={3.35422}
                  className="block h-auto w-full"
                />
              </div>
              <div className="absolute top-[98.0%] left-[26.63%] w-[63.88%]">
                <img
                  src="/barrier/lane-dashes.svg"
                  alt=""
                  width={345.485}
                  height={3.35422}
                  className="block h-auto w-full"
                />
              </div>
              <div
                className="absolute top-[68.14%] left-[37.72%] w-[41.05%] origin-[2%_50%] transition-transform duration-500 ease-out"
                style={{ transform: `rotate(${presentation.armAngle}deg)` }}
              >
                <img
                  src="/barrier/boom-open.svg"
                  alt=""
                  width={220.963}
                  height={9.79}
                  className="block h-auto w-full"
                />
              </div>
              <div className="absolute top-[63.04%] left-[32.61%] w-[6.02%]">
                <img
                  src="/barrier/cabinet-open.svg"
                  alt=""
                  width={32.395}
                  height={96.195}
                  className="block h-auto w-full"
                />
              </div>
            </>
          ) : (
            <>
              <div className="absolute top-[76.67%] left-[6.38%] w-[87.25%]">
                <img
                  src="/barrier/lane-line.svg"
                  alt=""
                  width={469.591}
                  height={3.35422}
                  className="block h-auto w-full"
                />
              </div>
              <div className="absolute top-[82.78%] left-[26.63%] w-[63.88%]">
                <img
                  src="/barrier/lane-dashes.svg"
                  alt=""
                  width={345.485}
                  height={3.35422}
                  className="block h-auto w-full"
                />
              </div>
              <div
                className="absolute top-[26.17%] left-[17.49%] w-[74.64%] origin-[2%_50%] transition-transform duration-500 ease-out"
                style={{ transform: `rotate(${presentation.armAngle}deg)` }}
              >
                <img
                  src="/barrier/boom-closed.svg"
                  alt=""
                  width={401.75}
                  height={17.8}
                  className="block h-auto w-full"
                />
              </div>
              <div className="absolute top-[16.89%] left-[8.20%] w-[10.94%]">
                <img
                  src="/barrier/cabinet-closed.svg"
                  alt=""
                  width={58.9}
                  height={174.9}
                  className="block h-auto w-full"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live region: state changes are announced, not just painted. */}
      <p
        role="status"
        aria-live="polite"
        className={cx(
          'flex items-center gap-2 text-sm leading-5',
          isOpen ? 'text-barrier-open' : 'text-ink-muted',
        )}
      >
        <img
          src={isOpen ? '/icons/info-open.svg' : '/icons/info-muted.svg'}
          alt=""
          width={20}
          height={20}
          className="block size-5 shrink-0"
        />
        <span>{explanation}</span>
      </p>
    </div>
  )
}
