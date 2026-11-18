import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { getDemoCredentials } from './auth/demo-access'
import { clearSession, setSession } from './auth/session-store'
import type { UsuarioPerfil } from './api/types'

const USER: UsuarioPerfil = {
  id: 2,
  nombreCompleto: 'Carlos Operador',
  email: 'operador@parqueadero.com',
  rol: 'OPERADOR',
  activo: true,
}

function authenticate(): void {
  setSession({ accessToken: 'token-123', user: USER })
}

/**
 * End-to-end render of the real application (router, guard, layout, providers)
 * inside jsdom. `fetch` is forced to fail so every authenticated test also
 * covers the DoD scenario "backend apagado": the UI must stay usable.
 */
describe('App shell sin sesión', () => {
  beforeEach(() => {
    clearSession()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  afterEach(() => {
    clearSession()
    vi.unstubAllGlobals()
  })

  it('redirige a /login al entrar a una vista operativa sin sesión', async () => {
    window.history.pushState({}, '', '/carril')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /menú principal/i })).not.toBeInTheDocument()
  })

  it('renderiza el login fuera del shell operativo', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /menú principal/i })).not.toBeInTheDocument()
  })

  it('muestra las credenciales de demostración en el formulario de login', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(await screen.findByText(/acceso de demostración \(solo desarrollo\)/i)).toBeInTheDocument()
    expect(screen.getByText(getDemoCredentials().email)).toBeInTheDocument()
    expect(screen.getByText(getDemoCredentials().password)).toBeInTheDocument()
  })

  it('permite entrar con las credenciales de demostración cuando el backend está caído', async () => {    const user = userEvent.setup()
    window.history.pushState({}, '', '/login')
    render(<App />)

    await user.type(screen.getByLabelText(/correo electrónico/i), getDemoCredentials().email)
    await user.type(screen.getByLabelText(/contraseña/i), getDemoCredentials().password)
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(
      await screen.findByRole('heading', { level: 1, name: /carril de entrada\/salida/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /menú principal/i })).toBeInTheDocument()
  })

  it('vuelve a la vista que el usuario pidió antes de autenticarse', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/consultas')
    render(<App />)

    await user.type(screen.getByLabelText(/correo electrónico/i), getDemoCredentials().email)
    await user.type(screen.getByLabelText(/contraseña/i), getDemoCredentials().password)
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByRole('heading', { level: 1, name: /^consultas$/i })).toBeInTheDocument()
  })
})

describe('App shell con sesión', () => {
  beforeEach(() => {
    authenticate()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  afterEach(() => {
    clearSession()
    vi.unstubAllGlobals()
  })

  it('redirige la raíz al carril y renderiza el menú principal', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /carril de entrada\/salida/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /menú principal/i })).toBeInTheDocument()
  })

  it('navega por todas las rutas base del DoD', async () => {
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

  it('renderiza la galería de la barrera en su ruta interna', async () => {
    window.history.pushState({}, '', '/dev/barrera')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /demo de la barrera simulada/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(3)
  })

  it('mantiene la pantalla usable y reporta la conexión cuando el backend está caído', async () => {
    window.history.pushState({}, '', '/carril')
    render(<App />)

    expect(await screen.findByText(/backend sin conexión/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /carril de entrada\/salida/i }),
    ).toBeInTheDocument()
  })

  it('renderiza un 404 controlado en lugar de una pantalla en blanco', async () => {
    window.history.pushState({}, '', '/ruta-que-no-existe')
    render(<App />)

    expect(await screen.findByText(/esta vista no existe/i)).toBeInTheDocument()
  })
})
