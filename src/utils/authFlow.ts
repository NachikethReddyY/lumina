import type { ApiUser } from './apiClient';

/** Placeholder names assigned at signup / OAuth before the user enters their real name. */
export function isPlaceholderName(firstName: string, lastName: string): boolean {
  const f = firstName.trim().toLowerCase();
  const l = lastName.trim().toLowerCase();
  return (
    (l === 'user' && (f === 'new' || f === 'google')) ||
    (l === 'new' && f === 'user')
  );
}

/** Next route after login, email verification, or OAuth — mirrors ProtectedRoute step order. */
export function getPostAuthPath(user: ApiUser | null | undefined): string {
  if (!user) return '/login';
  if (!user.name_set || isPlaceholderName(user.first_name, user.last_name)) {
    return '/complete-profile';
  }
  if (!user.email_is_verified) return '/verify-email-otp';
  if (!user.onboarding_completed) return '/onboarding';
  if (user.status !== 'active') return '/pending-approval';
  return '/dashboard';
}
