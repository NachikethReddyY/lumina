const { isOrgViewer, isTeamManager, isHrAdmin, isDeveloper } = require('./teamScope');

function ticketAssigneeId(ticket = {}) {
  return ticket.assigned_to ?? ticket.assigned_to_id ?? null;
}

function ticketSubmitterId(ticket = {}) {
  return ticket.submitted_by ?? ticket.submitted_by_id ?? null;
}

function isAssignee(user = {}, ticket = {}) {
  if (!user?.id) return false;
  return ticketAssigneeId(ticket) === user.id;
}

function isSubmitter(user = {}, ticket = {}) {
  if (!user?.id) return false;
  return ticketSubmitterId(ticket) === user.id;
}

/** Any active admin can view any org/team ticket, not just HR/managers. */
function canViewTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isSubmitter(user, ticket) || isAssignee(user, ticket)) return true;
  if (user.role === 'admin') return true;
  return false;
}

/** Anyone who can view the ticket may comment. */
function canCommentOnTicket(user = {}, ticket = {}) {
  return canViewTicket(user, ticket);
}

/** Assignee, managers, HR may edit title/description/replication steps. */
function canEditTicketDetails(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isAssignee(user, ticket)) return true;
  if (user.role === 'admin' && (isTeamManager(user) || isHrAdmin(user))) return true;
  return false;
}

/** Assignee or any manager may reroute. */
function canRerouteTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isAssignee(user, ticket)) return true;
  if (isTeamManager(user)) return true;
  return false;
}

/** Assignee with a developer job title / Developers department may send to QA. */
function canSendToQa(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (!isAssignee(user, ticket)) return false;
  return isDeveloper(user);
}

/**
 * Original canMutateTicket — assignee only.
 * Used for status/priority changes.
 * Managers also get canEditTicketDetails for detail edits.
 */
function canMutateTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  return isAssignee(user, ticket);
}

/** Check if ticket is currently assigned to QA (assigned_to has QA department). */
function isAssignedToQa(ticket = {}, assigneeDepartment) {
  const dept = (assigneeDepartment || ticket.assigned_to_department || '').trim();
  return dept === 'QA';
}

module.exports = {
  canMutateTicket,
  canViewTicket,
  canCommentOnTicket,
  canEditTicketDetails,
  canRerouteTicket,
  canSendToQa,
  isAssignedToQa,
  isAssignee,
  isSubmitter,
  ticketAssigneeId,
  ticketSubmitterId,
};
