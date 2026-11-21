import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarrierIndicator } from './BarrierIndicator'

describe('BarrierIndicator', () => {
  it('renders the state name and reason as text, not only as color', () => {
    render(<BarrierIndicator state="LLENO" reason="Cupo de carros agotado (40/40)." />)

    expect(screen.getByText('Lleno')).toBeInTheDocument()
    expect(screen.getByText('Cupo de carros agotado (40/40).')).toBeInTheDocument()
  })

  it('falls back to the default explanation when no reason is provided', () => {
    render(<BarrierIndicator state="CERRADA" />)

    expect(screen.getByText('Cerrada')).toBeInTheDocument()
    expect(screen.getByText(/no se permite el paso de vehículos/i)).toBeInTheDocument()
  })

  it('exposes the explanation through a live region', () => {
    render(<BarrierIndicator state="ABIERTA" />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent(/puede ingresar o salir/i)
  })

  it('renders the industrial cabinet and reflective boom matching the mockup state', () => {
    const { container, rerender } = render(<BarrierIndicator state="CERRADA" vehicleType="CARRO" />)

    expect(screen.getByText('Barrera')).toBeInTheDocument()
    expect(screen.getByText('Carril de carro')).toBeInTheDocument()
    expect(container.querySelector('img[src="/barrier/cabinet-closed.svg"]')).toBeInTheDocument()
    expect(container.querySelector('img[src="/barrier/boom-closed.svg"]')).toBeInTheDocument()

    rerender(<BarrierIndicator state="ABIERTA" vehicleType="MOTO" />)
    expect(screen.getByText('Carril de moto')).toBeInTheDocument()
    expect(container.querySelector('img[src="/barrier/cabinet-open.svg"]')).toBeInTheDocument()
    expect(container.querySelector('img[src="/barrier/boom-open.svg"]')).toBeInTheDocument()
  })
})
