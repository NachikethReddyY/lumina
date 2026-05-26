import { lazy } from 'react';

export const LazyUserDashboard = lazy(() => import('../pages/UserDashboard'));
export const LazyAdminDashboard = lazy(() => import('../pages/AdminDashboard'));
export const LazySuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard'));
export const LazyRoleDashboardPage = lazy(() => import('../pages/RoleDashboardPage'));
export const LazyProfilePage = lazy(() => import('../pages/ProfilePage'));
export const LazyAccountSettingsPage = lazy(() => import('../pages/AccountSettingsPage'));
export const LazyTicketHistoryPage = lazy(() => import('../pages/TicketHistoryPage'));
export const LazyTicketClosureAnalyticsPage = lazy(() => import('../pages/TicketClosureAnalyticsPage'));
