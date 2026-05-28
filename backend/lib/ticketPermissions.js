const { canViewOrgQueue, isTeamManager, isHrAdmin, isDeveloper, isQaManager } = require('./teamScope');

// Ticket authorization rules used by ticket routes and comments. The frontend
// hides actions based on similar user/ticket fields, but these checks are the
// source of truth before any assignment, status, priority, comment, or routing
// mutation reaches the database.
function ticketAssigneeId(ticket = {}) {
  return ticket.assigned_to ?? ticket.assigned_to_id ?? ticket.qa_assignee_id ?? null;
}

function ticketSubmitterId(ticket = {}) {
  return ticket.submitted_by ?? ticket.submitted_by_id ?? null;
}

function isQaAssignee(user = {}, ticket = {}) {
  if (!user?.id) return false;
  return (ticket.qa_assignee_id ?? null) === user.id;
}

function isDevAssignee(user = {}, ticket = {}) {
  if (!user?.id) return false;
  return (ticket.dev_assignee_id ?? null) === user.id;
}

function isAssignee(user = {}, ticket = {}) {
  if (!user?.id) return false;
  return isQaAssignee(user, ticket) || isDevAssignee(user, ticket) || ticketAssigneeId(ticket) === user.id;
}

function isSubmitter(user = {}, ticket = {}) {
  if (!user?.id) return false;
  return ticketSubmitterId(ticket) === user.id;
}

function canViewTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (user.status && user.status !== 'active') return false;
  if (canViewOrgQueue(user)) return true;
  return isSubmitter(user, ticket) || isAssignee(user, ticket);
}

function canCommentOnTicket(user = {}, ticket = {}) {
  return canViewTicket(user, ticket);
}

/** Author soft-delete, or admin moderation soft-delete. */
function canDeleteComment(user = {}, comment = {}) {
  if (!user?.id || !comment?.author_id) return false;
  if (comment.deleted_at || comment.is_deleted) return false;
  if (comment.author_id === user.id) return true;
  return user.role === 'admin';
}

function canEditTicketDetails(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isAssignee(user, ticket)) return true;
  if (user.role === 'admin' && (isTeamManager(user) || isHrAdmin(user) || isQaManager(user))) return true;
  return false;
}

function canRerouteTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isAssignee(user, ticket)) return true;
  if (isTeamManager(user) || isQaManager(user)) return true;
  return false;
}

function canRouteToDeveloper(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isTeamManager(user) || isQaManager(user)) return true;
  if (isQaAssignee(user, ticket)) return true;
  return false;
}

function canRerouteQa(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isTeamManager(user) || isQaManager(user)) return true;
  if (isQaAssignee(user, ticket)) return true;
  return false;
}

function canRouteToQa(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isTeamManager(user) || isQaManager(user)) return true;
  if (isDevAssignee(user, ticket)) return true;
  return false;
}

/** Developer assignee may send ticket to QA queue. */
function canSendToQa(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (!isAssignee(user, ticket)) return false;
  return isDeveloper(user);
}

function canMutateTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  return isAssignee(user, ticket);
}

function isAssignedToQa(ticket = {}, assigneeDepartment) {
  const dept = (assigneeDepartment || ticket.assigned_to_department || '').trim();
  return dept === 'QA';
}

module.exports = {
  canCommentOnTicket,
  canDeleteComment,
  canEditTicketDetails,
  canMutateTicket,
  canRerouteQa,
  canRerouteTicket,
  canRouteToDeveloper,
  canRouteToQa,
  canSendToQa,
  canViewTicket,
  isAssignedToQa,
  isAssignee,
  isDevAssignee,
  isDeveloper,
  isHrAdmin,
  isQaAssignee,
  isSubmitter,
  isTeamManager,
  ticketAssigneeId,
  ticketSubmitterId,
};
