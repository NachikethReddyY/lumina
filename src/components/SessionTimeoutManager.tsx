import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useToast } from '../context/useToast';
import { useUserContext } from '../context/UserContext';
import { clearAuthSession, isAuthPublicPath } from '../utils/sessionAuth';

export function SessionTimeoutManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { setUser } = useUserContext();

  const handleTimeout = useCallback(() => {
    if (!localStorage.getItem('authToken')) return;
    if (isAuthPublicPath(location.pathname)) return;

    clearAuthSession();
    setUser(null);
    showToast('Your session expired due to inactivity. Please sign in again.', 'info', 6000);
    navigate('/login', { replace: true, state: { message: 'Your session expired due to inactivity. Please sign in again.' } });
  }, [location.pathname, navigate, setUser, showToast]);

  useSessionTimeout(handleTimeout);
  return null;
}

export default SessionTimeoutManager;
