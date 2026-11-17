/** Lane/barrier states defined by the DoD. */
export type BarrierState = 'ABIERTA' | 'CERRADA' | 'LLENO'

export type BarrierTone = 'open' | 'closed' | 'full'

export type BarrierPresentation = {
  /** Short human label, always rendered next to the color. */
  label: string
  tone: BarrierTone
  /** Fallback explanation when the caller does not provide a specific reason. */
  defaultReason: string
  /** Arm angle in degrees: -60 is raised, 0 blocks the lane. */
  armAngle: number
}

export const BARRIER_STATES: readonly BarrierState[] = ['ABIERTA', 'CERRADA', 'LLENO']

/**
 * Visual + copy contract for every barrier state.
 *
 * Keep this as the only place that maps state to meaning. Encoding the state in
 * color alone would exclude color-blind users, so the tone drives color, and the
 * label/icon are always rendered as text.
 */
export const BARRIER_PRESENTATION: Record<BarrierState, BarrierPresentation> = {
  ABIERTA: {
    label: 'Abierta',
    tone: 'open',
    defaultReason: 'El carril está habilitado: el vehículo puede ingresar o salir.',
    armAngle: -60,
  },
  CERRADA: {
    label: 'Cerrada',
    tone: 'closed',
    defaultReason: 'El carril está bloqueado: no se permite el paso de vehículos.',
    armAngle: 0,
  },
  LLENO: {
    label: 'Lleno',
    tone: 'full',
    defaultReason: 'No hay cupos disponibles para este tipo de vehículo en la sede.',
    armAngle: 0,
  },
}

export type BarrierIconKind = 'open' | 'closed' | 'alert'

/** Icon paired with each state, so the badge never relies on color alone. */
export const BADGE_ICON: Record<BarrierState, BarrierIconKind> = {
  ABIERTA: 'open',
  CERRADA: 'closed',
  LLENO: 'alert',
}

export function isBarrierState(value: unknown): value is BarrierState {
  return typeof value === 'string' && Object.hasOwn(BARRIER_PRESENTATION, value)
}

export function getBarrierPresentation(state: BarrierState): BarrierPresentation {
  return BARRIER_PRESENTATION[state]
}

/** CSS variables, so the SVG arm follows the same tokens as the Tailwind classes. */
export const BARRIER_TONE_VAR: Record<BarrierTone, string> = {
  open: 'var(--color-barrier-open)',
  closed: 'var(--color-barrier-closed)',
  full: 'var(--color-barrier-full)',
}

export const BARRIER_BADGE_CLASSES: Record<BarrierTone, string> = {
  open: 'border-barrier-open/30 bg-barrier-open-soft text-barrier-open',
  closed: 'border-barrier-closed/30 bg-barrier-closed-soft text-barrier-closed',
  full: 'border-barrier-full/30 bg-barrier-full-soft text-barrier-full',
}
