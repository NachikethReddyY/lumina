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

  // Wait for the single shared fetch to complete before evaluating any route.
  // Because user state is shared, this only blocks once on initial load — not
  // on every navigation. Once loaded, all ProtectedRoutes evaluate instantly.
  if (loading && token) {
    return <div style={{ minHeight: '100vh', background: '#0b0c0e' }} />;
  }

  // Step 1: Must be authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const onCompleteProfilePage = location.pathname === '/complete-profile';

  // Step 2: Google OAuth — must confirm real name before proceeding
  if (!user.name_set) {
    if (!onCompleteProfilePage) {
      return <Navigate to="/complete-profile" replace />;
    }
    return <>{children}</>;
  }

  // Step 3: Email must be verified
  if (!user.email_is_verified && location.pathname !== '/verify-email-otp') {
    return <Navigate to="/verify-email-otp" replace />;
  }

  // Step 4: Onboarding must be completed (super_admin is exempt)
  if (!user.onboarding_completed && user.role !== 'super_admin') {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    return <>{children}</>;
  }

  // Step 5: Account must be approved
  if (user.status !== 'active') {
    if (location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />;
    }
    return <>{children}</>;
  }

  // Step 6: Role-based access check
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
