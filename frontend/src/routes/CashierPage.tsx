import { PageHeader } from '../components/ui/PageHeader'
import { PendingNotice } from '../components/ui/PendingNotice'

export function CashierPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Caja de pagos"
        description="Ruta base para el cobro de tickets y el registro de pagos en efectivo."
      />
      <PendingNotice
        title="Vista pendiente de implementación"
        description="La navegación y el layout ya funcionan. La lógica de caja se conecta cuando el módulo de cobros esté disponible."
        items={[
          'GET /cobros/pendiente — consulta del cobro del vehículo por placa.',
          'POST /pagos — registro idempotente del pago con pase diario.',
          'GET /cobros — historial de cobros generados.',
        ]}
      />
    </div>
  )
}
