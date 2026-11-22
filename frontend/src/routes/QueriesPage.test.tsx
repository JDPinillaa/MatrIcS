import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { QueriesPage } from './QueriesPage'

function renderQueriesPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <QueriesPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('QueriesPage — HU-08 Consultas de Eventos de Acceso y Cobros Generados', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Caso de Éxito HU-08: al cambiar a Cobros y filtrar por estado PENDIENTE en la fecha actual muestra solo los vehículos pendientes de pago con su tarifa histórica (RN-07)', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      // Initial GET /eventos load
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      // Initial GET /cobros load when switching tab
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 55,
              sedeId: 1,
              placa: 'ABC123',
              tipoVehiculo: 'CARRO',
              fechaDiaOperativo: '2026-11-21',
              franjaAplicada: 'DIURNA',
              valorAplicado: 4000,
              estado: 'PENDIENTE',
              generadoEn: '2026-11-21T13:10:00.000Z',
              pagadoEn: null,
            },
            {
              id: 56,
              sedeId: 1,
              placa: 'KLM482',
              tipoVehiculo: 'CARRO',
              fechaDiaOperativo: '2026-11-21',
              franjaAplicada: 'NOCTURNA',
              valorAplicado: 2500,
              estado: 'PAGADO',
              generadoEn: '2026-11-21T19:00:00.000Z',
              pagadoEn: '2026-11-21T20:15:00.000Z',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      // Filtered GET /cobros?fechaDiaOperativo=2026-11-21&estado=PENDIENTE
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 55,
              sedeId: 1,
              placa: 'ABC123',
              tipoVehiculo: 'CARRO',
              fechaDiaOperativo: '2026-11-21',
              franjaAplicada: 'DIURNA',
              valorAplicado: 4000,
              estado: 'PENDIENTE',
              generadoEn: '2026-11-21T13:10:00.000Z',
              pagadoEn: null,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderQueriesPage()

    await user.click(screen.getByRole('tab', { name: /cobros/i }))

    expect(await screen.findByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('KLM482')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/fecha/i), '2026-11-21')
    await user.selectOptions(screen.getByLabelText(/estado/i), 'PENDIENTE')
    await user.click(screen.getByRole('button', { name: /^buscar$/i }))

    expect(await screen.findByText('ABC123')).toBeInTheDocument()
    expect(screen.queryByText('KLM482')).not.toBeInTheDocument()
    expect(screen.getByText('DIURNA')).toBeInTheDocument()
    expect(screen.getByText(/\$4\.000/)).toBeInTheDocument()
  })

  it('Caso de Error / Sin Resultados HU-08: filtrar por una placa que nunca ha ingresado muestra tabla vacía con "No se encontraron registros con los filtros aplicados"', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 101,
              sedeId: 1,
              tipoVehiculo: 'CARRO',
              usuarioId: null,
              placa: 'ABC123',
              tipoEvento: 'ENTRADA',
              confianzaLectura: 98,
              lecturaManual: false,
              fechaHora: '2026-11-21T08:12:00.000Z',
              resultadoBarrera: 'ABIERTA',
              motivo: 'Cupo disponible y lectura automática válida',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderQueriesPage()

    expect(await screen.findByText('ABC123')).toBeInTheDocument()

    const plateInput = screen.getByLabelText(/placa/i)
    await user.clear(plateInput)
    await user.type(plateInput, 'ZZZ999')
    await user.click(screen.getByRole('button', { name: /^buscar$/i }))

    expect(
      await screen.findByText(/no se encontraron registros con los filtros aplicados/i),
    ).toBeInTheDocument()
    expect(screen.getByText('0 registros')).toBeInTheDocument()
  })
})
