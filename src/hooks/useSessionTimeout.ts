import { useEffect } from 'react';
import {
  formatSessionTimeoutLabel,
  getSessionRemainingMs,
  getSessionTimeoutMs,
  isAuthPublicPath,
  isSessionExpired,
  LAST_ACTIVITY_KEY,
  touchSessionActivity,
} from '../utils/sessionAuth';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function useSessionTimeout(onTimeout: () => void): void {
  useEffect(() => {
    if (!localStorage.getItem('authToken')) return;

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      touchSessionActivity();
    }

    let expiryTimerId: number | undefined;

    const clearExpiryTimer = () => {
      if (expiryTimerId !== undefined) {
        window.clearTimeout(expiryTimerId);
        expiryTimerId = undefined;
      }
    };

    const runCheck = () => {
      if (!localStorage.getItem('authToken')) return;
      if (isAuthPublicPath()) return;
      if (isSessionExpired()) {
        clearExpiryTimer();
        onTimeout();
      }
    };

    const scheduleExpiry = () => {
      clearExpiryTimer();
      if (!localStorage.getItem('authToken')) return;
      if (isAuthPublicPath()) return;

      const remaining = getSessionRemainingMs();
      if (remaining <= 0) {
        runCheck();
        return;
      }

      expiryTimerId = window.setTimeout(runCheck, remaining);
    };

    scheduleExpiry();

    // Light backup poll for edge cases (tab wake, clock skew).
    const backupIntervalMs = Math.min(5_000, Math.max(500, Math.floor(getSessionTimeoutMs() / 4)));
    const intervalId = window.setInterval(runCheck, backupIntervalMs);

    const onActivity = () => {
      if (!localStorage.getItem('authToken')) return;
      touchSessionActivity();
      scheduleExpiry();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'authToken' && !event.newValue) {
        clearExpiryTimer();
        onTimeout();
        return;
      }
      if (event.key === LAST_ACTIVITY_KEY) {
        scheduleExpiry();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearExpiryTimer();
      window.clearInterval(intervalId);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      window.removeEventListener('storage', onStorage);
    };
  }, [onTimeout]);
}

export function getSessionTimeoutLabel(): string {
  return formatSessionTimeoutLabel(getSessionTimeoutMs());
}
