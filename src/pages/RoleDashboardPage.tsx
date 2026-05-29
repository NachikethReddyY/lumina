import { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { isHrAdmin, isQaManager, isQaUser } from '../utils/orgRoles';

const LazyUserDashboard = lazy(() => import('./UserDashboard'));
const LazyAdminDashboard = lazy(() => import('./AdminDashboard'));
const LazyHrDashboard = lazy(() => import('./HrDashboard'));
const LazyQAManagerDashboard = lazy(() => import('./QAManagerDashboard'));

function DashboardFallback() {
  return <div style={{ minHeight: '100vh', background: 'var(--color-canvas)' }} />;
}

export function RoleDashboardPage() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <DashboardFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isHrAdmin(user)) {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <LazyHrDashboard />
      </Suspense>
    );
  }

  if (isQaManager(user)) {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <LazyQAManagerDashboard />
      </Suspense>
    );
  }

  if (isQaUser(user)) {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <LazyUserDashboard />
      </Suspense>
    );
  }

  if (user.role === 'admin') {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <LazyAdminDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<DashboardFallback />}>
      <LazyUserDashboard />
    </Suspense>
  );
}

export default RoleDashboardPage;
