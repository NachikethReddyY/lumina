import type { ApiUser } from './apiClient';

/** Google OAuth placeholder names — user must set a real name on /complete-profile first. */
export function needsNameCompletion(
  user: Pick<ApiUser, 'first_name' | 'last_name'> | null | undefined
): boolean {
  if (!user) return false;
  const first = user.first_name.trim().toLowerCase();
  const last = user.last_name.trim().toLowerCase();
  return (
    !first ||
    !last ||
    (last === 'user' && (first === 'new' || first === 'google'))
  );
}

/**
 * Post sign-in route order (must match ProtectedRoute):
 * 1. Collect name (Google placeholders)
 * 2. Onboarding
 * 3. Email verification
 * 4. Super-admin approval
 * 5. App
 */
export function getPostAuthPath(user: ApiUser): string {
  if (needsNameCompletion(user)) return '/complete-profile';
  if (!user.onboarding_completed && user.role !== 'super_admin') return '/onboarding';
  if (!user.email_is_verified) return '/verify-email-otp';
  if (user.status !== 'active') return '/pending-approval';
  return '/dashboard';
}
