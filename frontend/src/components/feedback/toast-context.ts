import { createContext, useContext } from 'react'

export type ToastVariant = 'error' | 'success' | 'info'

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

export type Notify = (toast: ToastInput) => void

export const ToastContext = createContext<Notify | null>(null)

export function useToast(): Notify {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>')
  }
  return context
}
