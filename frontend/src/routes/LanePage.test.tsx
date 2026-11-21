import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { AdministrationPage } from './AdministrationPage'
import { LanePage } from './LanePage'

function renderLanePage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <LanePage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function renderAdministrationPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdministrationPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('LanePage — HU-04 Validación manual por umbral de confianza', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Caso de Éxito HU-04: pausa MNP789 con 60% (<80%), pide confirmación manual, aprueba, abre barrera y registra LECTURA_MANUAL', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            nombre: 'Sede Principal',
            umbralConfianza: 80,
            activa: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requiereValidacionManual: true,
            resultadoBarrera: 'CERRADA',
            motivo:
              'Confianza de lectura (60%) inferior al umbral configurado (80%). Requiere validación manual del operador.',
            evento: null,
            cobro: null,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            descartado: false,
            resultadoBarrera: 'ABIERTA',
            motivo:
              'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)',
            evento: {
              id: 301,
              sedeId: 1,
              tipoVehiculo: 'CARRO',
              usuarioId: 2,
              placa: 'MNP789',
              tipoEvento: 'ENTRADA',
              confianzaLectura: 60,
              lecturaManual: true,
              fechaHora: '2026-11-21T14:35:00.000Z',
              resultadoBarrera: 'ABIERTA',
              motivo:
                'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)',
            },
            cobro: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderLanePage()

    const plateInput = screen.getByLabelText(/placa detectada/i)
    const confidenceInput = screen.getByLabelText(/nivel de confianza/i)

    await user.clear(plateInput)
    await user.type(plateInput, 'MNP789')
    await user.clear(confidenceInput)
    await user.type(confidenceInput, '60')

    await user.click(screen.getByRole('button', { name: /registrar ingreso/i }))

    expect(
      await screen.findByRole('region', { name: /validación manual de placa/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cerrada')).toBeInTheDocument()

    const manualPlateInput = screen.getByLabelText(/placa a confirmar o corregir/i)
    expect(manualPlateInput).toHaveValue('MNP789')

    await user.click(screen.getByRole('button', { name: /confirmar placa/i }))

    expect(await screen.findByText('Abierta')).toBeInTheDocument()
    expect(screen.getAllByText(/LECTURA_MANUAL/i).length).toBeGreaterThanOrEqual(1)
  })

  it('Caso de Error HU-04: muestra error de validación si el operador ingresa formato inválido (AB12) y no permite continuar', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            nombre: 'Sede Principal',
            umbralConfianza: 80,
            activa: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requiereValidacionManual: true,
            resultadoBarrera: 'CERRADA',
            motivo:
              'Confianza de lectura (60%) inferior al umbral configurado (80%). Requiere validación manual del operador.',
            evento: null,
            cobro: null,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderLanePage()

    await user.clear(screen.getByLabelText(/placa detectada/i))
    await user.type(screen.getByLabelText(/placa detectada/i), 'MNP789')
    await user.clear(screen.getByLabelText(/nivel de confianza/i))
    await user.type(screen.getByLabelText(/nivel de confianza/i), '60')

    await user.click(screen.getByRole('button', { name: /registrar ingreso/i }))

    const manualInput = await screen.findByLabelText(/placa a confirmar o corregir/i)
    await user.clear(manualInput)
    await user.type(manualInput, 'AB12')

    await user.click(screen.getByRole('button', { name: /confirmar placa/i }))

    expect(await screen.findByText(/formato de placa inválido/i)).toBeInTheDocument()
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /validación manual de placa/i }),
    ).toBeInTheDocument()
  })

  it('permite descartar la lectura dudosa por falso positivo manteniendo la barrera cerrada', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            nombre: 'Sede Principal',
            umbralConfianza: 80,
            activa: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requiereValidacionManual: true,
            resultadoBarrera: 'CERRADA',
            motivo:
              'Confianza de lectura (55%) inferior al umbral configurado (80%). Requiere validación manual del operador.',
            evento: null,
            cobro: null,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            descartado: true,
            resultadoBarrera: 'CERRADA',
            motivo:
              'Barrera Cerrada: Lectura descartada manualmente por el operador (LECTURA_MANUAL)',
            evento: null,
            cobro: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderLanePage()

    await user.clear(screen.getByLabelText(/nivel de confianza/i))
    await user.type(screen.getByLabelText(/nivel de confianza/i), '55')
    await user.click(screen.getByRole('button', { name: /registrar ingreso/i }))

    expect(
      await screen.findByRole('region', { name: /validación manual de placa/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /descartar lectura/i }))

    expect(
      screen.queryByRole('region', { name: /validación manual de placa/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
  })

  it('permite configurar el umbral de confianza en la pantalla de Administración de tarifas y cupos', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            nombre: 'Sede Principal',
            umbralConfianza: 80,
            activa: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            nombre: 'Sede Principal',
            umbralConfianza: 85,
            activa: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAdministrationPage()

    expect(await screen.findByText('Reconocimiento de placas')).toBeInTheDocument()
    const slider = screen.getByLabelText(/umbral de confianza/i)
    fireEvent.change(slider, { target: { value: '85' } })

    expect(screen.getByText('85%')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByText(/configuración sincronizada/i)).toBeInTheDocument()
  })
})
