import type { ApiUser } from './apiClient';

export const SETUP_PATHS = [
  '/complete-profile',
  '/verify-email-otp',
  '/onboarding',
  '/pending-approval',
] as const;

export type SetupPath = (typeof SETUP_PATHS)[number];

/** Placeholder names assigned at signup / OAuth before the user enters their real name. */
export function isPlaceholderName(firstName: string, lastName: string): boolean {
  const f = String(firstName ?? '').trim().toLowerCase();
  const l = String(lastName ?? '').trim().toLowerCase();
  return (
    (l === 'user' && (f === 'new' || f === 'google')) ||
    (l === 'new' && f === 'user')
  );
}

/**
 * Must visit /complete-profile. Uses server flag when present; otherwise derives locally.
 */
export function needsProfileName(user: ApiUser | null | undefined): boolean {
  if (!user) return true;
  if (typeof user.needs_profile_name === 'boolean') {
    return user.needs_profile_name;
  }
  if (!user.name_set) return true;
  if (isPlaceholderName(user.first_name, user.last_name)) return true;
  return false;
}

export function isSetupPath(pathname: string): boolean {
  return (SETUP_PATHS as readonly string[]).includes(pathname);
}

export function isSetupComplete(user: ApiUser): boolean {
  return (
    !needsProfileName(user) &&
    user.email_is_verified &&
    user.onboarding_completed &&
    user.status === 'active'
  );
}

/**
 * Single required route during setup. Order: name → email → onboarding → approval → dashboard.
 */
export function getRequiredPath(user: ApiUser | null | undefined): string {
  if (!user) return '/login';
  if (needsProfileName(user)) return '/complete-profile';
  if (!user.email_is_verified) return '/verify-email-otp';
  if (!user.onboarding_completed) return '/onboarding';
  if (user.status !== 'active') return '/pending-approval';
  return '/dashboard';
}

/** Hardwired post-auth redirect (Google, login, verify). */
export function resolveAuthRedirect(user: ApiUser | null | undefined): string {
  return getRequiredPath(user);
}

/** @deprecated Use getRequiredPath */
export const getPostAuthPath = getRequiredPath;

export function getPostEmailVerifyPath(user: ApiUser | null | undefined): string {
  return getRequiredPath(user);
}

export function getSetupStepNumber(user: ApiUser | null | undefined): 1 | 2 | 3 {
  if (!user || needsProfileName(user)) return 1;
  if (!user.onboarding_completed) return 2;
  return 3;
}
