import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyEmailOtpPage from './pages/VerifyEmailOtpPage';
import OnboardingPage from './pages/OnboardingPage';
import OAuthNamePage from './pages/OAuthNamePage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import NotFoundPage from './pages/NotFoundPage';
import ServerErrorPage from './pages/ServerErrorPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import { SetupLoading } from './components/SetupLoading';
import SessionTimeoutManager from './components/SessionTimeoutManager';
import { ToastProvider } from './context/ToastContext';
import { UserProvider } from './context/UserContext';
import {
  LazyUserDashboard,
  LazyAdminDashboard,
  LazySuperAdminDashboard,
  LazyRoleDashboardPage,
  LazyProfilePage,
  LazyAccountSettingsPage,
  LazyTicketHistoryPage,
  LazyTicketClosureAnalyticsPage,
} from './routes/lazyPages';
import './App.css';

function LazySuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SetupLoading />}>
      <ChunkErrorBoundary>
        {children}
      </ChunkErrorBoundary>
    </Suspense>
  );
}

function App() {
  return (
    <ToastProvider>
      <UserProvider>
      <SessionTimeoutManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email-otp" element={<VerifyEmailOtpPage />} />

        <Route path="/complete-profile" element={<ProtectedRoute><OAuthNamePage /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute><LazySuspense><LazyRoleDashboardPage /></LazySuspense></ProtectedRoute>} />
        <Route path="/dashboard/tickets" element={<ProtectedRoute><LazySuspense><LazyRoleDashboardPage /></LazySuspense></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><LazySuspense><LazyTicketHistoryPage mode="queue" /></LazySuspense></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<ProtectedRoute><LazySuspense><LazyTicketHistoryPage mode="queue" /></LazySuspense></ProtectedRoute>} />
        <Route path="/tickets/history" element={<ProtectedRoute><LazySuspense><LazyTicketHistoryPage mode="history" /></LazySuspense></ProtectedRoute>} />
        <Route path="/tickets/history/:id" element={<ProtectedRoute><LazySuspense><LazyTicketHistoryPage mode="history" /></LazySuspense></ProtectedRoute>} />
        <Route path="/tickets/analytics" element={<ProtectedRoute><LazySuspense><LazyTicketClosureAnalyticsPage /></LazySuspense></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><LazySuspense><LazyProfilePage /></LazySuspense></ProtectedRoute>} />
        <Route path="/account-settings" element={<ProtectedRoute><LazySuspense><LazyAccountSettingsPage /></LazySuspense></ProtectedRoute>} />

        <Route path="/user/dashboard" element={<ProtectedRoute roles={['user']}><LazySuspense><LazyUserDashboard /></LazySuspense></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><LazySuspense><LazyAdminDashboard /></LazySuspense></ProtectedRoute>} />
        <Route path="/admin/approvals" element={<ProtectedRoute roles={['admin']} hrAdminOnly><LazySuspense><LazySuperAdminDashboard /></LazySuspense></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><LazySuspense><LazySuperAdminDashboard /></LazySuspense></ProtectedRoute>} />
        <Route path="/admin/routing-logs" element={<ProtectedRoute roles={['admin']}><LazySuspense><LazySuperAdminDashboard /></LazySuspense></ProtectedRoute>} />

        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </UserProvider>
    </ToastProvider>
  );
}

export default App;
