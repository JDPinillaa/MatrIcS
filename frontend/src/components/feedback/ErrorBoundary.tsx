import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

/**
 * Last line of defense: a render crash must never leave a blank screen.
 * The user gets an explanation and a way back, and the error is logged.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[MatrIcS] Error no controlado en la interfaz', error, info.componentStack)
  }

  handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-card border border-feedback-error-line bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Algo salió mal en esta vista</h1>
          <p className="mt-2 text-sm text-ink-muted">
            La interfaz encontró un error inesperado y detuvo el renderizado de esta sección para
            evitar un estado inconsistente.
          </p>
          <p className="mt-3 rounded-control bg-feedback-error-soft p-3 font-mono text-xs break-words text-ink">
            {error.message}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-control bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-control border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }
}
