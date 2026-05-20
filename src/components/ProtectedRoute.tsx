import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { needsNameCompletion } from '../utils/authRedirect';

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

  // Step 1 — Must be signed in
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const onCompleteProfilePage = location.pathname === '/complete-profile';
  const onOnboardingPage = location.pathname === '/onboarding';
  const onVerifyEmailPage = location.pathname === '/verify-email-otp';
  const onPendingApprovalPage = location.pathname === '/pending-approval';

  // Step 2 — Google placeholder name (complete-profile) before anything else
  if (needsNameCompletion(user)) {
    if (!onCompleteProfilePage) {
      return <Navigate to="/complete-profile" replace />;
    }
    return <>{children}</>;
  }

  // Step 3 — Onboarding before email verification or approval (super_admin skips)
  if (!user.onboarding_completed && user.role !== 'super_admin') {
    if (!onOnboardingPage) {
      return <Navigate to="/onboarding" replace />;
    }
    return <>{children}</>;
  }

  // Step 4 — Email verification (only after onboarding is done)
  if (!user.email_is_verified) {
    if (!onVerifyEmailPage) {
      return <Navigate to="/verify-email-otp" replace />;
    }
    return <>{children}</>;
  }

  // Step 5 — Super-admin approval (only after onboarding + verified email)
  if (user.status !== 'active') {
    if (!onPendingApprovalPage) {
      return <Navigate to="/pending-approval" replace />;
    }
    return <>{children}</>;
  }

  // Step 6 — Role gate for admin-only routes
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
