import { useState } from 'react'
import { BarrierIndicator } from '../components/barrier/BarrierIndicator'
import { BARRIER_STATES } from '../components/barrier/barrier-state'
import type { BarrierState } from '../components/barrier/barrier-state'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PendingNotice } from '../components/ui/PendingNotice'
import { cx } from '../lib/cx'
import type { VehicleType } from '../api/types'

const VEHICLE_OPTIONS: readonly { value: VehicleType; label: string }[] = [
  { value: 'CARRO', label: 'Carro' },
  { value: 'MOTO', label: 'Moto' },
]

export function LanePage() {
  const [state, setState] = useState<BarrierState>('CERRADA')
  const [vehicleType, setVehicleType] = useState<VehicleType>('CARRO')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Carril de entrada/salida"
        description="Vista base del carril. La barrera simulada refleja el estado del carril y el motivo que lo explica."
      />

      <Card>
        <CardHeader
          title="Estado del carril"
          description="El componente es reutilizable: recibe el estado y el motivo, y nunca depende de un backend para renderizar."
        />

        <BarrierIndicator state={state} vehicleType={vehicleType} />

        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
              Simulación de estado
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Cambiar el estado de la barrera">
              {BARRIER_STATES.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={state === candidate}
                  onClick={() => setState(candidate)}
                  className={cx(
                    'rounded-control border px-3 py-1.5 text-sm font-medium transition-colors',
                    state === candidate
                      ? 'border-brand-500 bg-brand-100 text-brand-700'
                      : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )}
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
              Tipo de vehículo
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Cambiar el tipo de vehículo">
              {VEHICLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={vehicleType === option.value}
                  onClick={() => setVehicleType(option.value)}
                  className={cx(
                    'rounded-control border px-3 py-1.5 text-sm font-medium transition-colors',
                    vehicleType === option.value
                      ? 'border-brand-500 bg-brand-100 text-brand-700'
                      : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <PendingNotice
        title="Integración pendiente con el backend"
        description="Esta vista ya está ruteada y lista. Falta conectar los flujos reales cuando el módulo de accesos esté disponible."
        items={[
          'POST /accesos/ingreso — registro de entrada y apertura de barrera.',
          'POST /accesos/validacion-manual — ingreso autorizado por el operador.',
          'POST /accesos/salida — control de salida y cierre de la barrera.',
          'GET /lpr/reconocer — lectura automática de placa (HU-09).',
        ]}
      />
    </div>
  )
}
