import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ErrorBoundary } from './components/feedback/ErrorBoundary'
import { ToastProvider } from './components/feedback/ToastProvider'
import { AppLayout } from './components/layout/AppLayout'
import { ROUTES } from './navigation/routes'
import { AdministrationPage } from './routes/AdministrationPage'
import { BarrierDemoPage } from './routes/BarrierDemoPage'
import { CashierPage } from './routes/CashierPage'
import { LanePage } from './routes/LanePage'
import { LoginPage } from './routes/LoginPage'
import { NotFoundPage } from './routes/NotFoundPage'
import { QueriesPage } from './routes/QueriesPage'

/**
 * Application shell.
 *
 * `ErrorBoundary` is outermost so a crash in any provider still renders
 * something usable instead of a blank page (DoD requirement).
 */
export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path={ROUTES.login} element={<LoginPage />} />

            <Route element={<AppLayout />}>
              <Route index element={<Navigate to={ROUTES.lane} replace />} />
              <Route path={ROUTES.lane} element={<LanePage />} />
              <Route path={ROUTES.cashier} element={<CashierPage />} />
              <Route path={ROUTES.administration} element={<AdministrationPage />} />
              <Route path={ROUTES.queries} element={<QueriesPage />} />
              <Route path={ROUTES.barrierDemo} element={<BarrierDemoPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
