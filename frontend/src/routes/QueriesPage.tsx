import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  listAccessEvents,
  listCharges,
  type ChargeStatus,
} from '../api/queries-api'
import type {
  AccessEventType,
  CobroSummaryDto,
  EventoAccesoDto,
} from '../api/types'
import { cx } from '../lib/cx'

type QueryTab = 'accesos' | 'cobros'
type CaptureOriginFilter = 'TODOS' | 'AUTOMATICA' | 'LECTURA_MANUAL'

const FALLBACK_EVENTS: readonly EventoAccesoDto[] = [
  {
    id: 1,
    sedeId: 1,
    tipoVehiculo: 'CARRO',
    usuarioId: null,
    placa: 'ABC123',
    tipoEvento: 'ENTRADA',
    confianzaLectura: 98,
    lecturaManual: false,
    fechaHora: '2026-11-20T13:12:00.000Z',
    resultadoBarrera: 'ABIERTA',
    motivo: 'Cupo disponible y lectura automática válida',
  },
  {
    id: 2,
    sedeId: 1,
    tipoVehiculo: 'MOTO',
    usuarioId: 2,
    placa: 'XYZ78A',
    tipoEvento: 'ENTRADA',
    confianzaLectura: 62,
    lecturaManual: true,
    fechaHora: '2026-11-20T13:40:00.000Z',
    resultadoBarrera: 'ABIERTA',
    motivo: 'Placa corregida por el operador (LECTURA_MANUAL)',
  },
  {
    id: 3,
    sedeId: 1,
    tipoVehiculo: 'CARRO',
    usuarioId: null,
    placa: 'JKL456',
    tipoEvento: 'SALIDA',
    confianzaLectura: 95,
    lecturaManual: false,
    fechaHora: '2026-11-20T14:05:00.000Z',
    resultadoBarrera: 'ABIERTA',
    motivo: 'Pago registrado',
  },
  {
    id: 4,
    sedeId: 1,
    tipoVehiculo: 'MOTO',
    usuarioId: null,
    placa: 'RTY65H',
    tipoEvento: 'ENTRADA',
    confianzaLectura: 99,
    lecturaManual: false,
    fechaHora: '2026-11-20T16:20:00.000Z',
    resultadoBarrera: 'LLENO',
    motivo: 'Sin cupos disponibles para motos',
  },
]

const FALLBACK_CHARGES: readonly CobroSummaryDto[] = [
  {
    id: 51,
    sedeId: 1,
    placa: 'ABC123',
    tipoVehiculo: 'CARRO',
    fechaDiaOperativo: '2026-11-21',
    franjaAplicada: 'DIURNA',
    valorAplicado: 4000,
    estado: 'PENDIENTE',
    generadoEn: '2026-11-21T13:12:00.000Z',
    pagadoEn: null,
  },
  {
    id: 52,
    sedeId: 1,
    placa: 'KLM482',
    tipoVehiculo: 'CARRO',
    fechaDiaOperativo: '2026-11-20',
    franjaAplicada: 'DIURNA',
    valorAplicado: 4000,
    estado: 'PAGADO',
    generadoEn: '2026-11-20T14:00:00.000Z',
    pagadoEn: '2026-11-20T19:26:00.000Z',
  },
  {
    id: 53,
    sedeId: 1,
    placa: 'UVW82D',
    tipoVehiculo: 'MOTO',
    fechaDiaOperativo: '2026-11-20',
    franjaAplicada: 'DIURNA',
    valorAplicado: 0,
    estado: 'EXENTO',
    generadoEn: '2026-11-20T18:54:00.000Z',
    pagadoEn: null,
  },
]

function formatShortDateTime(isoString: string | null): string {
  if (!isoString) {
    return '—'
  }
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return isoString
  }
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${day}/${month} ${hours}:${minutes}`
}

function formatCopCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`
}

export function QueriesPage() {
  const [activeTab, setActiveTab] = useState<QueryTab>('accesos')

  // Filtros de Eventos de Acceso
  const [eventPlate, setEventPlate] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState<'TODOS' | AccessEventType>('TODOS')
  const [eventOrigin, setEventOrigin] = useState<CaptureOriginFilter>('TODOS')

  // Filtros de Cobros Generados
  const [chargePlate, setChargePlate] = useState('')
  const [chargeDate, setChargeDate] = useState('')
  const [chargeStatus, setChargeStatus] = useState<'TODOS' | ChargeStatus>(
    'TODOS',
  )

  const [events, setEvents] = useState<EventoAccesoDto[]>([])
  const [charges, setCharges] = useState<CobroSummaryDto[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const fetchEvents = useCallback(
    async (
      filters: {
        placa: string
        fecha: string
        tipoEvento: 'TODOS' | AccessEventType
        origen: CaptureOriginFilter
      },
      signal?: AbortSignal,
    ) => {
      setIsLoading(true)
      const normalizedPlate = filters.placa.trim().toUpperCase()
      const lecturaManual =
        filters.origen === 'TODOS'
          ? undefined
          : filters.origen === 'LECTURA_MANUAL'

      try {
        const data = await listAccessEvents(
          {
            placa: normalizedPlate || undefined,
            fecha: filters.fecha || undefined,
            tipoEvento:
              filters.tipoEvento === 'TODOS' ? undefined : filters.tipoEvento,
            lecturaManual,
          },
          signal,
        )
        setEvents(data)
      } catch {
        // Fallback local si el backend está apagado.
        const filtered = FALLBACK_EVENTS.filter((item) => {
          if (
            normalizedPlate &&
            !item.placa.toUpperCase().includes(normalizedPlate)
          ) {
            return false
          }
          if (filters.fecha && !item.fechaHora.startsWith(filters.fecha)) {
            return false
          }
          if (
            filters.tipoEvento !== 'TODOS' &&
            item.tipoEvento !== filters.tipoEvento
          ) {
            return false
          }
          if (
            typeof lecturaManual === 'boolean' &&
            item.lecturaManual !== lecturaManual
          ) {
            return false
          }
          return true
        })
        setEvents(filtered)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const fetchCharges = useCallback(
    async (
      filters: {
        placa: string
        fechaDiaOperativo: string
        estado: 'TODOS' | ChargeStatus
      },
      signal?: AbortSignal,
    ) => {
      setIsLoading(true)
      const normalizedPlate = filters.placa.trim().toUpperCase()

      try {
        const data = await listCharges(
          {
            placa: normalizedPlate || undefined,
            fechaDiaOperativo: filters.fechaDiaOperativo || undefined,
            estado: filters.estado === 'TODOS' ? undefined : filters.estado,
          },
          signal,
        )
        setCharges(data)
      } catch {
        // Fallback local si el backend está apagado.
        const filtered = FALLBACK_CHARGES.filter((item) => {
          if (
            normalizedPlate &&
            !item.placa.toUpperCase().includes(normalizedPlate)
          ) {
            return false
          }
          if (
            filters.fechaDiaOperativo &&
            item.fechaDiaOperativo !== filters.fechaDiaOperativo
          ) {
            return false
          }
          if (filters.estado !== 'TODOS' && item.estado !== filters.estado) {
            return false
          }
          return true
        })
        setCharges(filtered)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    if (activeTab === 'accesos') {
      void fetchEvents(
        {
          placa: eventPlate,
          fecha: eventDate,
          tipoEvento: eventType,
          origen: eventOrigin,
        },
        controller.signal,
      )
    } else {
      void fetchCharges(
        {
          placa: chargePlate,
          fechaDiaOperativo: chargeDate,
          estado: chargeStatus,
        },
        controller.signal,
      )
    }
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (activeTab === 'accesos') {
      void fetchEvents({
        placa: eventPlate,
        fecha: eventDate,
        tipoEvento: eventType,
        origen: eventOrigin,
      })
    } else {
      void fetchCharges({
        placa: chargePlate,
        fechaDiaOperativo: chargeDate,
        estado: chargeStatus,
      })
    }
  }

  const handleClearFilters = (): void => {
    if (activeTab === 'accesos') {
      setEventPlate('')
      setEventDate('')
      setEventType('TODOS')
      setEventOrigin('TODOS')
      void fetchEvents({
        placa: '',
        fecha: '',
        tipoEvento: 'TODOS',
        origen: 'TODOS',
      })
    } else {
      setChargePlate('')
      setChargeDate('')
      setChargeStatus('TODOS')
      void fetchCharges({
        placa: '',
        fechaDiaOperativo: '',
        estado: 'TODOS',
      })
    }
  }

  const totalCount = activeTab === 'accesos' ? events.length : charges.length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl leading-7 font-semibold tracking-[-0.2px] text-ink">
            Consultas
          </h1>
          <p className="text-sm leading-5 text-ink-muted">
            Historial de accesos y cobros generados.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Tipo de consulta"
          className="inline-flex min-w-[220px] items-center gap-1 rounded-control border border-line-strong bg-surface p-[5px]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'accesos'}
            onClick={() => setActiveTab('accesos')}
            className={cx(
              'min-h-8 flex-1 rounded-[4px] px-6 py-1.5 text-[13px] leading-[18px] transition-colors',
              activeTab === 'accesos'
                ? 'border border-ink bg-surface-sunken font-semibold text-ink'
                : 'border border-transparent bg-surface font-normal text-ink-muted hover:text-ink',
            )}
          >
            Accesos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cobros'}
            onClick={() => setActiveTab('cobros')}
            className={cx(
              'min-h-8 flex-1 rounded-[4px] px-6 py-1.5 text-[13px] leading-[18px] transition-colors',
              activeTab === 'cobros'
                ? 'border border-ink bg-surface-sunken font-semibold text-ink'
                : 'border border-transparent bg-surface font-normal text-ink-muted hover:text-ink',
            )}
          >
            Cobros
          </button>
        </div>
      </header>

      <section
        aria-label="Filtros de búsqueda"
        className="rounded-card border border-line bg-surface p-4 shadow-card"
      >
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap items-end gap-3"
          noValidate
        >
          {activeTab === 'accesos' ? (
            <>
              <div className="flex w-40 flex-col gap-1">
                <label
                  htmlFor="filter-event-plate"
                  className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
                >
                  Placa
                </label>
                <input
                  id="filter-event-plate"
                  type="text"
                  value={eventPlate}
                  onChange={(e) => setEventPlate(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="h-10 w-full rounded-control border border-line-strong bg-surface px-3 font-mono text-sm font-bold text-ink uppercase placeholder:text-ink-subtle"
                />
              </div>

              <div className="flex w-44 flex-col gap-1">
                <label
                  htmlFor="filter-event-date"
                  className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
                >
                  Fecha
                </label>
                <input
                  id="filter-event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                />
              </div>

              <div className="flex w-44 flex-col gap-1">
                <label
                  htmlFor="filter-event-type"
                  className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
                >
                  Tipo de evento
                </label>
                <select
                  id="filter-event-type"
                  value={eventType}
                  onChange={(e) =>
                    setEventType(e.target.value as 'TODOS' | AccessEventType)
                  }
                  className="h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                >
                  <option value="TODOS">Todos</option>
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="SALIDA">SALIDA</option>
                </select>
              </div>

              <div className="flex w-44 flex-col gap-1">
                <label
                  htmlFor="filter-event-origin"
                  className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
                >
                  Origen
                </label>
                <select
                  id="filter-event-origin"
                  value={eventOrigin}
                  onChange={(e) =>
                    setEventOrigin(e.target.value as CaptureOriginFilter)
                  }
                  className="h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                >
                  <option value="TODOS">Todos</option>
                  <option value="AUTOMATICA">AUTOMATICA</option>
                  <option value="LECTURA_MANUAL">LECTURA_MANUAL</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex w-40 flex-col gap-1">
                <label
                  htmlFor="filter-charge-plate"
                  className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
                >
                  Placa
                </label>
                <input
                  id="filter-charge-plate"
                  type="text"
                  value={chargePlate}
                  onChange={(e) => setChargePlate(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="h-10 w-full rounded-control border border-line-strong bg-surface px-3 font-mono text-sm font-bold text-ink uppercase placeholder:text-ink-subtle"
                />
              </div>

              <div className="flex w-44 flex-col gap-1">
                <label
                  htmlFor="filter-charge-date"
                  className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
                >
                  Fecha
                </label>
                <input
                  id="filter-charge-date"
                  type="date"
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                  className="h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                />
              </div>

              <div className="flex w-44 flex-col gap-1">
                <label
                  htmlFor="filter-charge-status"
                  className="text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase"
                >
                  Estado
                </label>
                <select
                  id="filter-charge-status"
                  value={chargeStatus}
                  onChange={(e) =>
                    setChargeStatus(e.target.value as 'TODOS' | ChargeStatus)
                  }
                  className="h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="PAGADO">PAGADO</option>
                  <option value="EXENTO">EXENTO</option>
                  <option value="ANULADO">ANULADO</option>
                </select>
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-10 items-center justify-center rounded-control bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-70"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={isLoading}
              className="inline-flex min-h-10 items-center justify-center rounded-control border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base leading-6 font-semibold text-ink">
            Resultados
          </h2>
          <span className="text-[13px] leading-[18px] text-ink-muted">
            {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'accesos' ? (
            <table className="w-full text-left text-[13px] leading-[18px]">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase">
                  <th className="px-4 py-4">Fecha y hora</th>
                  <th className="px-4 py-4">Placa</th>
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-4 py-4">Evento</th>
                  <th className="px-4 py-4">Confianza</th>
                  <th className="px-4 py-4">Barrera</th>
                  <th className="px-4 py-4">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink-muted">
                      {formatShortDateTime(ev.fechaHora)}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold whitespace-nowrap text-ink uppercase">
                      {ev.placa}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink">
                      {ev.tipoVehiculo === 'CARRO' ? 'Carro' : 'Moto'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-4 font-semibold tracking-[0.6px] uppercase',
                          ev.tipoEvento === 'ENTRADA'
                            ? 'bg-surface-sunken text-ink'
                            : 'border border-line-strong bg-surface-muted text-ink-muted',
                        )}
                      >
                        {ev.tipoEvento}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ev.lecturaManual ? (
                        <span className="inline-flex items-center rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-ink-muted">
                          Manual
                        </span>
                      ) : (
                        <span className="font-mono text-ink">
                          {ev.confianzaLectura}
                          <span className="text-ink-muted">%</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EventBarrierPill state={ev.resultadoBarrera} />
                    </td>
                    <td className="px-4 py-3.5 text-ink-muted">
                      {ev.motivo ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-[13px] leading-[18px]">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-xs leading-4 font-semibold tracking-[0.6px] text-ink-muted uppercase">
                  <th className="px-6 py-4">Día operativo</th>
                  <th className="px-6 py-4">Placa</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Franja</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha de pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-ink-muted">
                      {charge.fechaDiaOperativo}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold whitespace-nowrap text-ink uppercase">
                      {charge.placa}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-ink">
                      {charge.tipoVehiculo === 'CARRO' ? 'Carro' : 'Moto'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-muted">
                        {charge.franjaAplicada}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold whitespace-nowrap text-ink">
                      {formatCopCurrency(charge.valorAplicado)}
                    </td>
                    <td className="px-6 py-3">
                      <ChargeStatusPill status={charge.estado} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-ink-muted">
                      {formatShortDateTime(charge.pagadoEn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalCount === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-1.5 px-6 py-16 text-center">
              <p className="text-[15px] leading-[22px] font-semibold text-ink">
                Sin resultados
              </p>
              <p className="text-[13px] leading-5 text-ink-muted">
                No se encontraron registros con los filtros aplicados
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function EventBarrierPill({
  state,
}: {
  state: EventoAccesoDto['resultadoBarrera']
}) {
  if (state === 'ABIERTA') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-barrier-open-soft px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-barrier-open">
        <img
          src="/icons/check-circle.svg"
          alt=""
          width={20}
          height={20}
          className="block size-5 shrink-0"
        />
        ABIERTA
      </span>
    )
  }

  if (state === 'LLENO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-feedback-alert-soft px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-feedback-alert">
        <img
          src="/icons/alert-triangle.svg"
          alt=""
          width={20}
          height={20}
          className="block size-5 shrink-0"
        />
        LLENO
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-feedback-alert bg-surface px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-feedback-alert">
      <img
        src="/icons/clock-pending.svg"
        alt=""
        width={20}
        height={20}
        className="block size-5 shrink-0"
      />
      CERRADA
    </span>
  )
}

function ChargeStatusPill({ status }: { status: ChargeStatus }) {
  if (status === 'PAGADO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-barrier-open-soft px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-barrier-open">
        <img
          src="/icons/check-circle.svg"
          alt=""
          width={20}
          height={20}
          className="block size-5 shrink-0"
        />
        Pagado
      </span>
    )
  }

  if (status === 'PENDIENTE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-feedback-alert-soft px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-feedback-alert">
        <img
          src="/icons/clock-pending.svg"
          alt=""
          width={20}
          height={20}
          className="block size-5 shrink-0"
        />
        Pendiente
      </span>
    )
  }

  if (status === 'EXENTO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-ink">
        Exento
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[13px] leading-[18px] font-semibold text-ink-muted">
      <img
        src="/icons/x-circle.svg"
        alt=""
        width={20}
        height={20}
        className="block size-5 shrink-0"
      />
      Anulado
    </span>
  )
}
