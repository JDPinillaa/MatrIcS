import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../navigation/routes'
import { useSession } from './use-session'

/**
 * Blocks every operational route until a session exists.
 *
 * The `from` state lets the login view send the user back to the page they
 * originally asked for, instead of always dropping them on the lane.
 */
export function RequireSession() {
  const session = useSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to={ROUTES.login} replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <Outlet />
}
