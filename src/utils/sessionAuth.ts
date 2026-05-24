import { invalidateApiCache } from '../hooks/useApiSWR';

const LAST_ACTIVITY_KEY = 'lumina.session.lastActivity';

const DURATION_PATTERN =
  /^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/i;

const AUTH_PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

/** Parse durations like `300s`, `5m`, `1h`, or bare seconds (`300`). */
export function parseSessionTimeout(raw?: string | null): number {
  const value = String(raw ?? import.meta.env.VITE_SESSION_TIMEOUT ?? '5m').trim();
  const match = value.match(DURATION_PATTERN);
  if (!match) return 5 * 60 * 1000;

  const amount = parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 5 * 60 * 1000;

  const unit = (match[2] ?? 's').toLowerCase();
  if (unit.startsWith('h')) return amount * 60 * 60 * 1000;
  if (unit.startsWith('m')) return amount * 60 * 1000;
  return amount * 1000;
}

export function getSessionTimeoutMs(): number {
  return parseSessionTimeout(import.meta.env.VITE_SESSION_TIMEOUT);
}

export function formatSessionTimeoutLabel(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds % 3600 === 0) return `${totalSeconds / 3600} hour${totalSeconds === 3600 ? '' : 's'}`;
  if (totalSeconds % 60 === 0) return `${totalSeconds / 60} minute${totalSeconds === 60 ? '' : 's'}`;
  return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
}

export function isAuthPublicPath(pathname = window.location.pathname): boolean {
  return AUTH_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function touchSessionActivity(): void {
  if (!localStorage.getItem('authToken')) return;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearAuthSession(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  invalidateApiCache('users:');
}

export function getLastActivityTime(): number | null {
  const lastRaw = localStorage.getItem(LAST_ACTIVITY_KEY);
  const last = lastRaw ? Number(lastRaw) : NaN;
  return Number.isFinite(last) ? last : null;
}

export function getSessionRemainingMs(now = Date.now()): number {
  const lastActivity = getLastActivityTime();
  if (lastActivity === null) return getSessionTimeoutMs();
  return Math.max(0, getSessionTimeoutMs() - (now - lastActivity));
}

export function isSessionExpired(now = Date.now()): boolean {
  const token = localStorage.getItem('authToken');
  if (!token) return false;

  const lastRaw = localStorage.getItem(LAST_ACTIVITY_KEY);
  const lastActivity = lastRaw ? Number(lastRaw) : NaN;
  if (!Number.isFinite(lastActivity)) return false;

  return now - lastActivity >= getSessionTimeoutMs();
}

export { LAST_ACTIVITY_KEY };
