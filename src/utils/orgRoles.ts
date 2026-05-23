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
): { scope?: 'org' | 'team' | 'assigned' } {
  if (isHrAdmin(user)) return { scope: 'org' };
  if (isTeamManager(user)) return { scope: 'team' };
  return {};
}

/** Only HR runs new-account approvals. */
export function canAccessApprovalQueue(user: ApiUser | null | undefined): boolean {
  return isHrAdmin(user);
}

export type QueueOwnershipFilter = 'team' | 'assigned';

export function showQueueOwnershipFilter(user: ApiUser | null | undefined): boolean {
  return user?.role === 'admin';
}

/** Ticket queue list — admins can toggle team/org vs assigned to me. */
export function getTicketQueueListScope(
  user: ApiUser | null | undefined,
  ownership: QueueOwnershipFilter
): { scope?: 'org' | 'team' | 'assigned' } {
  if (!user || user.role !== 'admin') return {};

  if (isHrAdmin(user)) {
    return ownership === 'assigned' ? { scope: 'assigned' } : { scope: 'org' };
  }

  return ownership === 'assigned' ? { scope: 'assigned' } : { scope: 'team' };
}
