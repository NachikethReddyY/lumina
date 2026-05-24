import type { ApiUser } from './apiClient';

export function isHrAdmin(user: ApiUser | null | undefined): boolean {
  return user?.role === 'admin' && user?.department === 'HR';
}

export function isTeamManager(user: ApiUser | null | undefined): boolean {
  return user?.role === 'admin' && user?.department === 'Managers';
}

export function isOrgViewer(user: ApiUser | null | undefined): boolean {
  return isHrAdmin(user) || isTeamManager(user);
}

/** Only the active assignee may reroute or change ticket fields. */
export function canMutateTicket(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null } | null | undefined
): boolean {
  return Boolean(user?.id && ticket?.assigned_to_id && ticket.assigned_to_id === user.id);
}

/** HR and managers inspect org tickets read-only. */
export function isTicketOversightAdmin(user: ApiUser | null | undefined): boolean {
  return isOrgViewer(user);
}

/** Ticket list scope for dashboards and ticket pages. */
export function getTicketListScope(
  user: ApiUser | null | undefined
): { scope?: 'org' | 'team' | 'assigned' } {
  if (isOrgViewer(user)) return { scope: 'org' };
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

  if (isOrgViewer(user)) {
    return ownership === 'assigned' ? { scope: 'assigned' } : { scope: 'org' };
  }

  return ownership === 'assigned' ? { scope: 'assigned' } : { scope: 'team' };
}
