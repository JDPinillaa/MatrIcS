import { PageHeader } from '../components/ui/PageHeader'
import { PendingNotice } from '../components/ui/PendingNotice'

export function AdministrationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Administración de tarifas y cupos"
        description="Ruta base para configurar tarifas, franjas horarias y cupos por sede."
      />
      <PendingNotice
        title="Vista pendiente de implementación"
        description="La ruta y el menú están listos. La configuración por sede se conecta cuando el módulo de administración esté disponible."
        items={[
          'GET /sedes/{sedeId}/configuracion — tarifas, franjas, cupos y umbral de confianza.',
          'PUT /sedes/{sedeId}/tarifas — actualización de valores por tipo de vehículo.',
          'PUT /sedes/{sedeId}/franjas — franjas diurna y nocturna.',
          'PUT /sedes/{sedeId}/cupos — capacidad máxima por tipo de vehículo.',
        ]}
      />
    </div>
  )
}
