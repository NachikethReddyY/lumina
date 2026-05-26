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

/**
 * Read access mirrors backend canViewTicket: active users see the whole organization.
 */
export function canViewTicket(
  user: ApiUser | null | undefined,
  ticket: { submitted_by_id?: string | null; assigned_to_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (user.status !== 'active') return false;
  return true;
}

export function canCommentOnTicket(
  user: ApiUser | null | undefined,
  ticket: { submitted_by_id?: string | null; assigned_to_id?: string | null } | null | undefined
): boolean {
  return canViewTicket(user, ticket);
}

/** User may remove their own comment; admins may moderate any comment. */
export function canDeleteComment(
  user: ApiUser | null | undefined,
  comment: { author_id?: string; is_deleted?: boolean } | null | undefined
): boolean {
  if (!user?.id || !comment?.author_id) return false;
  if (comment.is_deleted) return false;
  if (comment.author_id === user.id) return true;
  return user.role === 'admin';
}

export function canMutateTicket(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null; qa_assignee_id?: string | null; dev_assignee_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  return (
    ticket.assigned_to_id === user.id
    || ticket.qa_assignee_id === user.id
    || ticket.dev_assignee_id === user.id
  );
}

export function canEditTicketDetails(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null; qa_assignee_id?: string | null; dev_assignee_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (canMutateTicket(user, ticket)) return true;
  if (user.role === 'admin' && (isTeamManager(user) || isHrAdmin(user))) return true;
  return false;
}

export function canRerouteTicket(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null; qa_assignee_id?: string | null; dev_assignee_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (canMutateTicket(user, ticket)) return true;
  if (isTeamManager(user)) return true;
  return false;
}

export function canSendToQa(
  user: ApiUser | null | undefined,
  ticket: { assigned_to_id?: string | null } | null | undefined
): boolean {
  if (!user?.id || !ticket) return false;
  if (ticket.assigned_to_id !== user.id) return false;
  return isDeveloper(user);
}

export function isTicketOversightAdmin(user: ApiUser | null | undefined): boolean {
  return isOrgViewer(user);
}

/** Default ticket list: organization-wide for every active user. */
export function getTicketListScope(
  user: ApiUser | null | undefined
): { scope?: 'org' | 'team' | 'assigned' } {
  if (!user || user.status !== 'active') return {};
  return { scope: 'org' };
}

export function canAccessApprovalQueue(user: ApiUser | null | undefined): boolean {
  return isHrAdmin(user);
}

export type QueueOwnershipFilter = 'team' | 'assigned';

export function showQueueOwnershipFilter(user: ApiUser | null | undefined): boolean {
  return user?.role === 'admin';
}

export function getTicketQueueListScope(
  user: ApiUser | null | undefined,
  ownership: QueueOwnershipFilter
): { scope?: 'org' | 'team' | 'assigned' } {
  if (!user || user.status !== 'active') return {};

  if (ownership === 'assigned') {
    return { scope: 'assigned' };
  }
  return { scope: 'org' };
}
