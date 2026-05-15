import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

type Props = {
  children: React.ReactNode;
  roles?: Array<'user' | 'admin' | 'super_admin'>;
};

export function ProtectedRoute({ children, roles }: Props) {
  const location = useLocation();
  const { user, loading } = useCurrentUser();
  const token = localStorage.getItem('authToken');

  if (loading && token) {
    return <div style={{ minHeight: '100vh', background: '#0b0c0e' }} />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.email_is_verified && location.pathname !== '/verify-email-otp') {
    return <Navigate to="/verify-email-otp" replace />;
  }

  if (!user.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.status !== 'active' && location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

