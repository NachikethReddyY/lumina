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

export function isDeveloper(user: ApiUser | null | undefined): boolean {
  if (!user?.job_title && !user?.department) return false;
  const title = (user.job_title || '').toLowerCase();
  if (user.department === 'Developers') return true;
  const devKeywords = ['developer', 'engineer', 'software', 'dev', 'architect', 'tech lead'];
  return devKeywords.some((kw) => title.includes(kw));
}

/** Any active admin can view any org/team ticket. */
export function canViewTicket(
  user: ApiUser | null | undefined,
  ticket: { submitted_by_id?: string | null; assigned_to_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (ticket.submitted_by_id === user.id || ticket.assigned_to_id === user.id) return true;
  if (user.role === 'admin') return true;
  return false;
}

/** Anyone who can view the ticket may comment. */
export function canCommentOnTicket(
  user: ApiUser | null | undefined,
  ticket: { submitted_by_id?: string | null; assigned_to_id?: string | null } | null | undefined
): boolean {
  return canViewTicket(user, ticket);
}

/** Assignee may mutate ticket (status, priority). */
export function canMutateTicket(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null } | null | undefined
): boolean {
  return Boolean(user?.id && ticket?.assigned_to_id && ticket.assigned_to_id === user.id);
}

/** Assignee, managers, HR may edit title/description/replication steps. */
export function canEditTicketDetails(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (ticket.assigned_to_id === user.id) return true;
  if (user.role === 'admin' && (isTeamManager(user) || isHrAdmin(user))) return true;
  return false;
}

/** Assignee OR any manager may reroute. */
export function canRerouteTicket(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (ticket.assigned_to_id === user.id) return true;
  if (isTeamManager(user)) return true;
  return false;
}

/** Developer assignee may send to QA. */
export function canSendToQa(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (ticket.assigned_to_id !== user.id) return false;
  return isDeveloper(user);
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
