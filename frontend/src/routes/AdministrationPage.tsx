import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getSedeConfidenceThreshold,
  updateSedeConfidenceThreshold,
} from '../api/access-api'
import { useToast } from '../components/feedback/toast-context'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PendingNotice } from '../components/ui/PendingNotice'

const DEFAULT_SEDE_ID = 1

export function AdministrationPage() {
  const notify = useToast()

  const [savedThreshold, setSavedThreshold] = useState<number>(80)
  const [threshold, setThreshold] = useState<number>(80)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  useEffect(() => {
    const controller = new AbortController()
    getSedeConfidenceThreshold(DEFAULT_SEDE_ID, controller.signal)
      .then((sede) => {
        setSavedThreshold(sede.umbralConfianza)
        setThreshold(sede.umbralConfianza)
      })
      .catch(() => {
        // Mantiene 80% por defecto si el backend está apagado.
      })

    return () => controller.abort()
  }, [])

  const hasUnsavedChanges = threshold !== savedThreshold

  const handleSave = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    setIsSaving(true)

    try {
      const updated = await updateSedeConfidenceThreshold(
        DEFAULT_SEDE_ID,
        threshold,
      )
      setSavedThreshold(updated.umbralConfianza)
      setThreshold(updated.umbralConfianza)
      notify({
        title: 'Umbral de confianza guardado',
        description: `El umbral mínimo de lectura quedó en ${updated.umbralConfianza}%.`,
        variant: 'success',
      })
    } catch {
      setSavedThreshold(threshold)
      notify({
        title: 'Umbral aplicado localmente',
        description: `El umbral quedó en ${threshold}% para la sesión actual.`,
        variant: 'info',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = (): void => {
    setThreshold(savedThreshold)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Administración de tarifas y cupos"
        description="Define precios, horarios y capacidad de la sede."
      />

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-[25px]">
          <CardHeader
            title="Reconocimiento de placas"
            description="Controla cuándo el ingreso necesita intervención del operador."
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="umbral-confianza-range"
                className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
              >
                Umbral de confianza
              </label>
              <span className="text-sm leading-5 font-semibold text-ink">
                {threshold}%
              </span>
            </div>

            <div className="relative flex h-6 w-full items-center">
              <div className="relative h-2 w-full overflow-hidden rounded-full border border-line bg-surface-muted">
                <div
                  className="h-full rounded-full bg-ink transition-all"
                  style={{ width: `${threshold}%` }}
                />
              </div>
              <input
                id="umbral-confianza-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute size-4 -translate-x-1/2 rounded-full border-2 border-white bg-ink"
                style={{ left: `${threshold}%` }}
              />
            </div>
          </div>

          <p className="text-xs leading-4 text-ink-muted">
            Si la confianza de la lectura es menor, se exige validación manual
            del operador.
          </p>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs font-medium text-ink-muted">
              {hasUnsavedChanges
                ? 'Cambios sin guardar'
                : 'Configuración sincronizada'}
            </span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={!hasUnsavedChanges || isSaving}
                onClick={handleDiscard}
              >
                Descartar
              </Button>
              <Button
                type="submit"
                disabled={!hasUnsavedChanges || isSaving}
              >
                {isSaving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </Card>
      </form>

      <PendingNotice
        title="Secciones pendientes de administración (HU-02)"
        description="El umbral de confianza LPR (HU-04) ya está operativo. Las tarjetas de tarifas, franjas y cupos se conectan en la HU-02."
        items={[
          'PUT /sedes/{sedeId}/tarifas — actualización de valores por tipo de vehículo.',
          'PUT /sedes/{sedeId}/franjas — franjas diurna y nocturna.',
          'PUT /sedes/{sedeId}/cupos — capacidad máxima por tipo de vehículo.',
        ]}
      />
    </div>
  )
}
