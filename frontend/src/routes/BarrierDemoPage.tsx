import { BarrierIndicator } from '../components/barrier/BarrierIndicator'
import type { BarrierState } from '../components/barrier/barrier-state'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

type Scenario = {
  state: BarrierState
  reason: string
}

const SCENARIOS: readonly Scenario[] = [
  {
    state: 'ABIERTA',
    reason: 'Ingreso autorizado por lectura LPR de la placa ABC123.',
  },
  {
    state: 'CERRADA',
    reason: 'Carril cerrado por el operador mientras se despeja la zona.',
  },
  {
    state: 'LLENO',
    reason: 'Cupo de carros agotado (40/40). Solo se permite la salida de vehículos.',
  },
]

/**
 * Internal gallery used to review the barrier component without a backend.
 * Lives under /dev so it never pollutes the operational menu.
 */
export function BarrierDemoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demo de la barrera simulada"
        description="Los tres estados del carril con un motivo distinto cada uno. Sirve para verificar el componente reutilizable sin depender del backend."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {SCENARIOS.map((scenario) => (
          <Card key={scenario.state}>
            <CardHeader title={`Estado ${scenario.state}`} />
            <BarrierIndicator
              state={scenario.state}
              reason={scenario.reason}
              vehicleType={scenario.state === 'LLENO' ? 'CARRO' : undefined}
            />
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-ink">Por qué el estado no es solo color</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Cada estado se comunica con tres canales: color (verde, rojo, ámbar), un ícono y el
          nombre del estado en texto. Un operador con daltonismo, o cualquiera mirando una pantalla
          con poca luz, sigue distinguiendo ABIERTA de CERRADA. El motivo se actualiza dentro de una
          región <code className="font-mono text-xs">aria-live</code>, así que un lector de pantalla
          anuncia el cambio.
        </p>
      </Card>
    </div>
  )
}
