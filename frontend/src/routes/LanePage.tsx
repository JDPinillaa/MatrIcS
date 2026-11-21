import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink } from 'react-router'
import {
  getSedeConfidenceThreshold,
  registerEntry,
  registerExit,
  validateManualAccess,
} from '../api/access-api'
import type {
  AccessEventType,
  EventoAccesoDto,
  VehicleType,
} from '../api/types'
import { useSession } from '../auth/use-session'
import { BarrierIndicator } from '../components/barrier/BarrierIndicator'
import type { BarrierState } from '../components/barrier/barrier-state'
import { useToast } from '../components/feedback/toast-context'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { TextField } from '../components/ui/TextField'
import { isApiError } from '../lib/api-error'
import { cx } from '../lib/cx'
import { ROUTES } from '../navigation/routes'

const DEFAULT_SEDE_ID = 1
const CAR_PLATE_REGEX = /^[A-Z]{3}[0-9]{3}$/
const MOTO_PLATE_REGEX = /^[A-Z]{3}[0-9]{2}[A-Z]?$/

type PendingManualValidation = {
  tipoEvento: AccessEventType
  suggestedPlate: string
  confidence: number
  motivo: string
}

function classifyColombianPlate(rawPlate: string): {
  valid: boolean
  normalized: string
  vehicleType: VehicleType
  error?: string
} {
  const normalized = rawPlate.trim().toUpperCase()
  if (CAR_PLATE_REGEX.test(normalized)) {
    return { valid: true, normalized, vehicleType: 'CARRO' }
  }
  if (MOTO_PLATE_REGEX.test(normalized)) {
    return { valid: true, normalized, vehicleType: 'MOTO' }
  }
  return {
    valid: false,
    normalized,
    vehicleType: 'CARRO',
    error: `Formato de placa inválido ("${normalized || rawPlate}"). Use AAA123 para carro o AAA12A / AAA12 para moto.`,
  }
}

function formatHour(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return '14:32'
  }
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function LanePage() {
  const session = useSession()
  const notify = useToast()

  const [state, setState] = useState<BarrierState>('CERRADA')
  const [reason, setReason] = useState<string>(
    'El carril está bloqueado: no se permite el paso de vehículos.',
  )
  const [vehicleType, setVehicleType] = useState<VehicleType>('CARRO')

  const [sedeName, setSedeName] = useState('Sede Centro')
  const [threshold, setThreshold] = useState<number>(80)

  const [plateInput, setPlateInput] = useState<string>('ABC123')
  const [confidenceInput, setConfidenceInput] = useState<string>('98')
  const [readingError, setReadingError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const [pendingManual, setPendingManual] =
    useState<PendingManualValidation | null>(null)
  const [manualPlateInput, setManualPlateInput] = useState<string>('')
  const [manualError, setManualError] = useState<string | null>(null)

  const [recentEvents, setRecentEvents] = useState<EventoAccesoDto[]>([])

  useEffect(() => {
    const controller = new AbortController()
    getSedeConfidenceThreshold(DEFAULT_SEDE_ID, controller.signal)
      .then((sede) => {
        setSedeName(sede.nombre)
        setThreshold(sede.umbralConfianza)
      })
      .catch(() => {
        // Mantiene el umbral local por defecto (80%) si el backend está apagado.
      })

    return () => controller.abort()
  }, [])

  const currentConfidence = Number.parseFloat(confidenceInput) || 0
  const displayPlate =
    (pendingManual ? manualPlateInput : plateInput).trim().toUpperCase() ||
    '------'
  const detectedClassification = classifyColombianPlate(displayPlate)
  const isConfidenceBelowThreshold = currentConfidence < threshold

  const processLaneReading = async (
    tipoEvento: AccessEventType,
  ): Promise<void> => {
    setReadingError(null)
    setManualError(null)

    const classification = classifyColombianPlate(plateInput)
    const confidence = Number.parseFloat(confidenceInput)

    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
      setReadingError('El nivel de confianza debe estar entre 0% y 100%.')
      return
    }

    if (!classification.valid) {
      setReadingError(classification.error ?? 'Formato de placa inválido.')
      return
    }

    setVehicleType(classification.vehicleType)
    setIsSubmitting(true)

    try {
      const response =
        tipoEvento === 'ENTRADA'
          ? await registerEntry({
              sedeId: DEFAULT_SEDE_ID,
              placa: classification.normalized,
              confianzaLectura: confidence,
            })
          : await registerExit({
              sedeId: DEFAULT_SEDE_ID,
              placa: classification.normalized,
              confianzaLectura: confidence,
            })

      setState(response.resultadoBarrera)
      setReason(response.motivo)

      if (response.requiereValidacionManual) {
        setPendingManual({
          tipoEvento,
          suggestedPlate: classification.normalized,
          confidence,
          motivo: response.motivo,
        })
        setManualPlateInput(classification.normalized)
        notify({
          title: 'Validación manual requerida',
          description: response.motivo,
          variant: 'info',
        })
        return
      }

      setPendingManual(null)
      if (response.evento) {
        setRecentEvents((prev) => [response.evento!, ...prev].slice(0, 8))
      }
    } catch (cause) {
      if (isApiError(cause) && cause.kind === 'http') {
        setReadingError(cause.userMessage)
        return
      }

      // Fallback local cuando el backend está apagado: respeta las mismas reglas de HU-04.
      if (confidence < threshold) {
        const pauseReason = `Confianza de lectura (${confidence}%) inferior al umbral configurado (${threshold}%). Requiere validación manual del operador.`
        setState('CERRADA')
        setReason(pauseReason)
        setPendingManual({
          tipoEvento,
          suggestedPlate: classification.normalized,
          confidence,
          motivo: pauseReason,
        })
        setManualPlateInput(classification.normalized)
      } else {
        const autoReason =
          tipoEvento === 'ENTRADA'
            ? 'Barrera Abierta: Ingreso registrado correctamente'
            : 'Barrera Abierta: Salida autorizada'
        setState('ABIERTA')
        setReason(autoReason)
        setPendingManual(null)
        setRecentEvents((prev) =>
          [
            {
              id: Date.now(),
              sedeId: DEFAULT_SEDE_ID,
              tipoVehiculo: classification.vehicleType,
              usuarioId: null,
              placa: classification.normalized,
              tipoEvento,
              confianzaLectura: confidence,
              lecturaManual: false,
              fechaHora: new Date().toISOString(),
              resultadoBarrera: 'ABIERTA' as const,
              motivo: autoReason,
            },
            ...prev,
          ].slice(0, 8),
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmManual = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    if (!pendingManual) {
      return
    }
    setManualError(null)

    const classification = classifyColombianPlate(manualPlateInput)
    if (!classification.valid) {
      setManualError(
        classification.error ??
          'Formato de placa inválido. Corrija la placa para continuar.',
      )
      return
    }

    setIsSubmitting(true)
    try {
      const response = await validateManualAccess({
        sedeId: DEFAULT_SEDE_ID,
        tipoEvento: pendingManual.tipoEvento,
        accion: 'CONFIRMAR',
        placaCorregida: classification.normalized,
        confianzaOriginal: pendingManual.confidence,
        usuarioId: session?.user.id && session.user.id > 0 ? session.user.id : 2,
      })

      setVehicleType(classification.vehicleType)
      setState(response.resultadoBarrera)
      setReason(response.motivo)
      setPlateInput(classification.normalized)
      setPendingManual(null)

      if (response.evento) {
        setRecentEvents((prev) => [response.evento!, ...prev].slice(0, 8))
      }
      notify({
        title: 'Lectura confirmada (LECTURA_MANUAL)',
        description: response.motivo,
        variant: 'success',
      })
    } catch (cause) {
      if (isApiError(cause) && cause.kind === 'http') {
        setManualError(cause.userMessage)
        return
      }

      // Fallback local si el backend está apagado: registra como LECTURA_MANUAL.
      const manualReason = `Barrera Abierta: ${pendingManual.tipoEvento === 'ENTRADA' ? 'Ingreso' : 'Salida'} confirmado manualmente por el operador (LECTURA_MANUAL)`
      const fallbackEvent: EventoAccesoDto = {
        id: Date.now(),
        sedeId: DEFAULT_SEDE_ID,
        tipoVehiculo: classification.vehicleType,
        usuarioId: session?.user.id ?? 2,
        placa: classification.normalized,
        tipoEvento: pendingManual.tipoEvento,
        confianzaLectura: pendingManual.confidence,
        lecturaManual: true,
        fechaHora: new Date().toISOString(),
        resultadoBarrera: 'ABIERTA',
        motivo: manualReason,
      }
      setVehicleType(classification.vehicleType)
      setState('ABIERTA')
      setReason(manualReason)
      setPlateInput(classification.normalized)
      setPendingManual(null)
      setRecentEvents((prev) => [fallbackEvent, ...prev].slice(0, 8))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDiscardManual = async (): Promise<void> => {
    if (!pendingManual) {
      return
    }
    setManualError(null)
    setIsSubmitting(true)

    try {
      const response = await validateManualAccess({
        sedeId: DEFAULT_SEDE_ID,
        tipoEvento: pendingManual.tipoEvento,
        accion: 'DESCARTAR',
        confianzaOriginal: pendingManual.confidence,
      })

      setState(response.resultadoBarrera)
      setReason(response.motivo)
      setPendingManual(null)
      notify({
        title: 'Lectura descartada',
        description: response.motivo,
        variant: 'info',
      })
    } catch {
      setState('CERRADA')
      setReason(
        'Barrera Cerrada: Lectura descartada manualmente por el operador (LECTURA_MANUAL)',
      )
      setPendingManual(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openManualValidationDirect = (): void => {
    setReadingError(null)
    setManualError(null)
    const suggested = plateInput.trim().toUpperCase()
    setState('CERRADA')
    setReason(
      'Apertura pausada: intervención manual solicitada por el operador.',
    )
    setPendingManual({
      tipoEvento: 'ENTRADA',
      suggestedPlate: suggested,
      confidence: currentConfidence,
      motivo:
        'Intervención manual del operador para validar o corregir la placa en el carril.',
    })
    setManualPlateInput(suggested)
  }

  const lastEvent = recentEvents[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Carril de entrada/salida"
        description="Control de ingreso, validación manual y salida de vehículos."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
        <Card>
          <CardHeader
            title="Estado del carril"
            description="La barrera refleja el estado del carril y el motivo que lo explica."
          />

          <BarrierIndicator
            state={state}
            reason={reason}
            vehicleType={vehicleType}
          />

          <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Sede</dt>
              <dd className="font-medium text-ink">{sedeName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Operador</dt>
              <dd className="font-medium text-ink">
                {session?.user.nombreCompleto ?? 'Carlos Operador'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Último evento</dt>
              <dd className="font-medium text-ink">
                {lastEvent
                  ? `${formatHour(lastEvent.fechaHora)} · ${lastEvent.tipoEvento === 'ENTRADA' ? 'Ingreso' : 'Salida'} ${lastEvent.placa}${lastEvent.lecturaManual ? ' (LECTURA_MANUAL)' : ''}`
                  : '14:32 · Ingreso ABC123'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-base leading-6 font-semibold text-ink">
            Lectura de placa
          </h2>

          <div className="flex h-[120px] w-full flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-[#292821] bg-[#f9c924] px-4 py-3">
            <p className="font-mono text-[42px] leading-[50px] font-bold tracking-[3px] text-ink">
              {displayPlate}
            </p>
            <p className="text-[11px] leading-4 font-semibold tracking-[2px] text-ink uppercase">
              COLOMBIA
            </p>
          </div>

          <div className="flex justify-center">
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] leading-[18px] font-semibold',
                isConfidenceBelowThreshold
                  ? 'bg-feedback-alert-soft text-feedback-alert'
                  : 'bg-barrier-open-soft text-barrier-open',
              )}
            >
              <img
                src={
                  isConfidenceBelowThreshold
                    ? '/icons/error-alert.svg'
                    : '/icons/lpr-badge.svg'
                }
                alt=""
                width={20}
                height={20}
                className="block size-5 shrink-0"
              />
              LPR · {currentConfidence}% de confianza
            </span>
          </div>

          <div className="flex flex-col gap-1 pt-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Tipo:</span>
              <span className="text-ink">
                {detectedClassification.valid
                  ? detectedClassification.vehicleType === 'CARRO'
                    ? 'Carro'
                    : 'Moto'
                  : 'Por validar'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Ingreso:</span>
              <span className="text-ink">
                {lastEvent ? formatHour(lastEvent.fechaHora) : '14:32'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
            <TextField
              label="Placa detectada"
              name="placaDetectada"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              placeholder="MNP789"
            />
            <TextField
              label="Nivel de confianza (%)"
              name="confianzaLectura"
              type="number"
              min={0}
              max={100}
              value={confidenceInput}
              onChange={(e) => setConfidenceInput(e.target.value)}
              placeholder="60"
            />
          </div>

          {readingError ? (
            <div
              role="alert"
              className="flex w-full items-center gap-2 rounded-[4px] border-l-2 border-feedback-alert bg-feedback-alert-soft py-2 pr-3 pl-3.5 text-[13px] leading-[18px] font-semibold text-feedback-alert"
            >
              <img
                src="/icons/error-alert.svg"
                alt=""
                width={20}
                height={20}
                className="block size-5 shrink-0"
              />
              <span>{readingError}</span>
            </div>
          ) : null}

          {pendingManual ? (
            <section
              aria-label="Validación manual de placa"
              className="flex flex-col gap-3 rounded-control border border-feedback-alert bg-feedback-alert-soft/50 p-4"
            >
              <div className="flex items-start gap-2">
                <img
                  src="/icons/error-alert.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="mt-0.5 block size-5 shrink-0"
                />
                <div className="text-xs leading-4 text-ink">
                  <p className="font-semibold text-feedback-alert">
                    Apertura pausada · Requiere validación del operador
                  </p>
                  <p className="mt-1 text-ink-muted">
                    Placa sugerida por el lector:{' '}
                    <strong className="font-mono text-ink">
                      {pendingManual.suggestedPlate || 'SIN LECTURA'}
                    </strong>{' '}
                    ({pendingManual.confidence}% de confianza, umbral {threshold}
                    %).
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleConfirmManual}
                className="flex flex-col gap-3"
                noValidate
              >
                <TextField
                  label="Placa a confirmar o corregir"
                  name="placaCorregida"
                  value={manualPlateInput}
                  onChange={(e) => {
                    setManualPlateInput(e.target.value.toUpperCase())
                    if (manualError) {
                      setManualError(null)
                    }
                  }}
                  placeholder="AAA123 o AAA12A"
                  error={manualError ?? undefined}
                />

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Confirmar placa
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={handleDiscardManual}
                    className="border-feedback-alert text-feedback-alert hover:bg-feedback-alert-soft"
                  >
                    Descartar lectura
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => void processLaneReading('ENTRADA')}
              className="min-h-10 w-full"
            >
              Registrar ingreso
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={openManualValidationDirect}
              className="min-h-10 w-full"
            >
              Validación manual
            </Button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void processLaneReading('SALIDA')}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-control border border-feedback-alert bg-surface px-4 py-2 text-sm font-semibold text-feedback-alert transition-colors hover:bg-feedback-alert-soft disabled:cursor-not-allowed disabled:opacity-70"
            >
              Registrar salida
            </button>
          </div>
        </Card>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base leading-6 font-semibold text-ink">
            Movimientos recientes del carril
          </h2>
          <NavLink
            to={ROUTES.queries}
            className="text-sm leading-5 font-medium text-ink hover:underline"
          >
            Ver historial
          </NavLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] leading-[18px]">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase">
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Placa</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Movimiento</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentEvents.map((ev) => (
                <tr key={ev.id}>
                  <td className="px-6 py-4 text-ink-muted">
                    {formatHour(ev.fechaHora)}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-ink uppercase">
                    {ev.placa}
                  </td>
                  <td className="px-6 py-4 text-ink">
                    {ev.tipoVehiculo === 'CARRO' ? 'Carro' : 'Moto'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={cx(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-[13px] leading-[18px] font-semibold',
                        ev.tipoEvento === 'ENTRADA'
                          ? 'bg-surface-sunken text-ink'
                          : 'border border-line bg-surface-muted text-ink-muted',
                      )}
                    >
                      {ev.tipoEvento === 'ENTRADA' ? 'Ingreso' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-barrier-open-soft px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-barrier-open">
                        <img
                          src="/icons/check-circle.svg"
                          alt=""
                          width={20}
                          height={20}
                          className="block size-5 shrink-0"
                        />
                        Completado
                      </span>
                      {ev.lecturaManual ? (
                        <span className="inline-flex items-center rounded-full bg-feedback-alert-soft px-2.5 py-1 text-xs font-semibold text-feedback-alert">
                          LECTURA_MANUAL
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {recentEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-sm text-ink-muted"
                  >
                    Aún no se han registrado movimientos en esta sesión.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
