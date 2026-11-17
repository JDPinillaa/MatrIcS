import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

/**
 * End-to-end render of the real application (router, layout, providers) inside
 * jsdom. `fetch` is forced to fail so every test also covers the DoD scenario
 * "backend apagado": the UI must stay usable and report the failure.
 */
describe('App shell', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('redirects the root path into the lane view and renders the main menu', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /carril de entrada\/salida/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /menú principal/i })).toBeInTheDocument()
  })

  it('navigates to every base route of the DoD', async () => {
    const routes: Array<{ path: string; heading: RegExp }> = [
      { path: '/carril', heading: /carril de entrada\/salida/i },
      { path: '/caja', heading: /caja de pagos/i },
      { path: '/administracion', heading: /administración de tarifas y cupos/i },
      { path: '/consultas', heading: /^consultas$/i },
    ]

    for (const route of routes) {
      window.history.pushState({}, '', route.path)
      render(<App />)

      expect(await screen.findByRole('heading', { level: 1, name: route.heading })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: /menú principal/i })).toBeInTheDocument()
      cleanup()
    }
  })

  it('renders the barrier gallery on its internal route', async () => {
    window.history.pushState({}, '', '/dev/barrera')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /demo de la barrera simulada/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(3)
  })

  it('keeps the screen usable and reports the connection when the backend is down', async () => {
    window.history.pushState({}, '', '/carril')
    render(<App />)

    expect(await screen.findByText(/backend sin conexión/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /carril de entrada\/salida/i })).toBeInTheDocument()
  })

  it('renders a controlled 404 instead of a blank screen', async () => {
    window.history.pushState({}, '', '/ruta-que-no-existe')
    render(<App />)

    expect(await screen.findByText(/esta vista no existe/i)).toBeInTheDocument()
  })

  it('renders the login view outside the operational shell', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /menú principal/i })).not.toBeInTheDocument()
  })
})
