const { isOrgViewer } = require('./teamScope');

function ticketAssigneeId(ticket = {}) {
  return ticket.assigned_to ?? ticket.assigned_to_id ?? null;
}

function ticketSubmitterId(ticket = {}) {
  return ticket.submitted_by ?? ticket.submitted_by_id ?? null;
}

function isAssignee(user = {}, ticket = {}) {
  return ticketAssigneeId(ticket) === user.id;
}

function isSubmitter(user = {}, ticket = {}) {
  return ticketSubmitterId(ticket) === user.id;
}

/** HR and managers may inspect any organization ticket without mutating it. */
function canViewTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  if (isSubmitter(user, ticket) || isAssignee(user, ticket)) return true;
  if (user.role === 'admin' && isOrgViewer(user)) return true;
  return false;
}

/** Only the active assignee may change status, priority, assignment, or routing. */
function canMutateTicket(user = {}, ticket = {}) {
  if (!user?.id || !ticket) return false;
  return isAssignee(user, ticket);
}

module.exports = {
  canMutateTicket,
  canViewTicket,
  isAssignee,
  isSubmitter,
  ticketAssigneeId,
  ticketSubmitterId,
};
