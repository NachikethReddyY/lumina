import type { ApiUser } from './apiClient';

export function isHrAdmin(user: ApiUser | null | undefined): boolean {
  return user?.role === 'admin' && user?.department === 'HR';
}

export function isTeamManager(user: ApiUser | null | undefined): boolean {
  return user?.role === 'admin' && user?.department === 'Managers';
}

/** Ticket list scope for dashboards and ticket pages. */
export function getTicketListScope(
  user: ApiUser | null | undefined
): { scope?: 'org' | 'team' } {
  if (isHrAdmin(user)) return { scope: 'org' };
  if (isTeamManager(user)) return { scope: 'team' };
  return {};
}
