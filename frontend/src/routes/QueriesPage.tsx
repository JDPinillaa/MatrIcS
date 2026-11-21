import { PageHeader } from '../components/ui/PageHeader'
import { PendingNotice } from '../components/ui/PendingNotice'

export function QueriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Consultas"
        description="Ruta base para el historial filtrado de accesos y cobros."
      />
      <PendingNotice
        title="Vista pendiente de implementación"
        description="La navegación ya funciona. Los filtros y tablas se conectan cuando el módulo de consultas esté disponible."
        items={[
          'GET /eventos — historial de eventos de acceso.',
          'GET /cobros — cobros generados con sus filtros.',
        ]}
      />
    </div>
  )
}
