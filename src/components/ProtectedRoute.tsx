import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../context/UserContext';
import { getRequiredPath, isSetupPath } from '../utils/authFlow';
import { canAccessApprovalQueue } from '../utils/orgRoles';
import { clearAuthSession, isSessionExpired } from '../utils/sessionAuth';
import { SetupLoading } from './SetupLoading';

type Props = {
  children: React.ReactNode;
  roles?: Array<'user' | 'admin'>;
  /** Restrict route to HR admins (e.g. approval queue). */
  hrAdminOnly?: boolean;
};

export function ProtectedRoute({ children, roles, hrAdminOnly }: Props) {
  const location = useLocation();
  const { user, loading } = useUserContext();
  const token = localStorage.getItem('authToken');

  if (token && isSessionExpired()) {
    clearAuthSession();
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, message: 'Your session expired due to inactivity. Please sign in again.' }}
      />
    );
  }

  if (loading && token) {
    return <SetupLoading message="Loading your account…" />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const requiredPath = getRequiredPath(user);
  const onSetupRoute = isSetupPath(location.pathname);

  // Until setup is finished, user may only be on the single required step route.
  if (requiredPath !== '/dashboard') {
    if (location.pathname !== requiredPath) {
      return <Navigate to={requiredPath} replace />;
    }
    return <>{children}</>;
  }

  // Setup finished — leave setup pages
  if (onSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hrAdminOnly && !canAccessApprovalQueue(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
