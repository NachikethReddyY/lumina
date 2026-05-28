import type { ApiTicket } from '../../utils/apiClient';
import { apiAssetUrl } from '../../utils/apiBase';
import { formatTicketStatusLabel } from '../../utils/ticketStatusLabel';

const PRIORITY_COLOR: Record<string, string> = {
  P1: '#cf2d56',
  P2: '#2563eb',
  P3: '#1f8a65',
  P4: '#807d72',
};

const STATUS_COLOR: Record<string, string> = {
  open: '#807d72',
  assigned: '#2563eb',
  in_progress: '#1f8a65',
  resolved: '#1f8a65',
  closed: '#a09c92',
  on_hold: '#c08532',
  pending_routing: '#dfa88f',
};

type RoutingMetadata = {
  source?: string;
  reasoning?: string;
  assigned_admin_id?: string | null;
  decision?: {
    confidence?: number;
    assignee_name?: string | null;
    assignee_job_title?: string | null;
    rationale?: string;
    steps?: Array<{ phase?: string; summary?: string }>;
    ticket_note?: {
      summary?: string;
      rationale?: string;
      next_step?: string;
    };
  } | null;
};

function getRouting(ticket?: ApiTicket | null): RoutingMetadata | null {
  return (ticket?.metadata?.routing as RoutingMetadata | undefined) || null;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function cleanLabel(value?: string | null): string {
  return value?.trim() || '';
}

function ticketCode(ticket: ApiTicket): string {
  return `LM-${ticket.id.slice(0, 3).toUpperCase()}`;
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function assigneeLabel(ticket: ApiTicket) {
  const assignedName = cleanLabel(ticket.assigned_to_name);
  if (assignedName) return assignedName;
  const routing = getRouting(ticket);
  const decisionName = cleanLabel(routing?.decision?.assignee_name);
  if (decisionName) return decisionName;
  if (ticket.status === 'pending_routing') return 'Pending routing';
  if (routing?.assigned_admin_id) return 'Assignment missing';
  return 'Unassigned';
}

function assigneeRoleLabel(ticket: ApiTicket): string {
  const fromAssignee = cleanLabel(ticket.assigned_to_job_title);
  if (fromAssignee) return fromAssignee;
  const fromDecision = cleanLabel(getRouting(ticket)?.decision?.assignee_job_title);
  return fromDecision || '';
}

export function AssigneeCell({ ticket }: { ticket: ApiTicket }) {
  const name = assigneeLabel(ticket);
  const role = assigneeRoleLabel(ticket);
  return (
    <div className="th-person-cell">
      <span className="th-person-avatar">
        {ticket.assigned_to_avatar_url ? <img src={apiAssetUrl(ticket.assigned_to_avatar_url)} alt="" /> : initials(name)}
      </span>
      <span className="th-person-meta">
        <strong>{name}</strong>
        {role ? <small>{role}</small> : null}
      </span>
    </div>
  );
}

export type TicketListItemProps = {
  ticket: ApiTicket;
  selected: boolean;
  onSelect: (id: string) => void;
  mode: 'queue' | 'history';
};

export function TicketListItem({ ticket, selected, onSelect, mode }: TicketListItemProps) {
  const listTimestamp = mode === 'history' ? (ticket.closed_at || ticket.created_at) : ticket.created_at;
  return (
    <button
      className={`th-list-item ${selected ? 'active' : ''}`}
      onClick={() => onSelect(ticket.id)}
    >
      <span className="th-list-top">
        <span className="th-priority-pill" style={{ color: PRIORITY_COLOR[ticket.priority], background: `${PRIORITY_COLOR[ticket.priority]}14` }}>
          {ticket.priority}
        </span>
        <span className="th-ticket-id">{ticketCode(ticket)}</span>
        <span className="th-list-time">{timeAgo(listTimestamp)}</span>
      </span>
      <span className="th-list-title">{ticket.title}</span>
      <span className="th-list-meta-row">
        <span className="th-list-status" style={{ background: `${STATUS_COLOR[ticket.status]}18`, color: STATUS_COLOR[ticket.status] }}>
          {formatTicketStatusLabel(ticket.status)}
        </span>
        <span className="th-list-assignee">{assigneeLabel(ticket)}{ticket.dev_assignee_name && ticket.qa_assignee_name ? ` · ${ticket.qa_assignee_name}` : ''}</span>
      </span>
    </button>
  );
}

export default TicketListItem;
