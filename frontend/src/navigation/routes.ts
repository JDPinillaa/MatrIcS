export const ROUTES = {
  login: '/login',
  lane: '/carril',
  cashier: '/caja',
  administration: '/administracion',
  queries: '/consultas',
  barrierDemo: '/dev/barrera',
} as const

export type NavItem = {
  to: string
  label: string
  shortLabel: string
  description: string
}

/** Main menu of the operational app (login lives outside the shell). */
export const MAIN_NAV: readonly NavItem[] = [
  {
    to: ROUTES.lane,
    label: 'Carril de entrada/salida',
    shortLabel: 'Carril',
    description: 'Control de ingreso, validación manual y salida de vehículos.',
  },
  {
    to: ROUTES.cashier,
    label: 'Caja de pagos',
    shortLabel: 'Caja',
    description: 'Cobros pendientes y registro de pagos en efectivo.',
  },
  {
    to: ROUTES.administration,
    label: 'Administración de tarifas y cupos',
    shortLabel: 'Administración',
    description: 'Configuración de tarifas, franjas horarias y cupos por sede.',
  },
  {
    to: ROUTES.queries,
    label: 'Consultas',
    shortLabel: 'Consultas',
    description: 'Historial de accesos y cobros generados.',
  },
]
