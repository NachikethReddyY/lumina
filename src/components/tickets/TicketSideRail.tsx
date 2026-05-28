import { type CSSProperties } from 'react';
import { BrainCircuit } from 'lucide-react';
import type { ApiTicket } from '../../utils/apiClient';
import { AssigneeCell } from './TicketListItem';
import { TicketTimelinePanel, type TimelineEvent } from './TicketTimelinePanel';
import { formatTicketStatusLabel } from '../../utils/ticketStatusLabel';

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

const STATUS_OPTIONS: Array<{ value: ApiTicket['status']; label: string }> = [
  { value: 'open', label: 'To Do' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'pending_routing', label: 'Pending routing' },
  { value: 'resolved', label: formatTicketStatusLabel('resolved') },
  { value: 'closed', label: formatTicketStatusLabel('closed') },
];

function getRouting(ticket?: ApiTicket | null): RoutingMetadata | null {
  return (ticket?.metadata?.routing as RoutingMetadata | undefined) || null;
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function humanize(value?: string | null): string {
  if (!value) return '';
  return value.replace(/_/g, ' ');
}

function cleanLabel(value?: string | null): string {
  return value?.trim() || '';
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

function assigneeDisplay(ticket: ApiTicket): string {
  const name = assigneeLabel(ticket);
  const role = assigneeRoleLabel(ticket);
  return role ? `${name} · ${role}` : name;
}

function teamFor(ticket: ApiTicket): string {
  if (ticket.category_name) return ticket.category_name;
  if (ticket.type === 'incident') return 'Platform & Infrastructure';
  if (ticket.type === 'software') return 'Software Support';
  return 'Bug Reports';
}

function priorityLabel(priority: ApiTicket['priority']): string {
  if (priority === 'P1') return 'Critical';
  if (priority === 'P2') return 'High';
  if (priority === 'P3') return 'Medium';
  return 'Low';
}

function confidenceScore(ticket?: ApiTicket | null): number {
  const raw = getRouting(ticket)?.decision?.confidence;
  if (typeof raw === 'number') {
    return Math.max(0, Math.min(100, Math.round(raw <= 1 ? raw * 100 : raw)));
  }
  if (!ticket) return 0;
  if (ticket.status === 'pending_routing') return 42;
  if (ticket.assigned_to_name) return 86;
  return 58;
}

function recommendationFor(ticket: ApiTicket): string {
  if (ticket.status === 'pending_routing') return 'Route immediately';
  if (ticket.priority === 'P1') return 'Expedite review';
  if (ticket.status === 'resolved' || ticket.status === 'closed') return 'Archive with learnings';
  return 'Continue owner follow-up';
}

function luminaVoice(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/Gemini AI/gi, 'Lumina AI')
    .replace(/Gemini fallback was used because:\s*/gi, 'Lumina AI used fallback routing because ')
    .replace(/Gemini routing request failed \(429\)/gi, 'the routing model was rate limited (429)')
    .replace(/Gemini routing request failed \((\d+)\)/gi, 'the routing model request failed ($1)')
    .replace(/Gemini API key/gi, 'Lumina AI routing key')
    .replace(/Gemini returned/gi, 'Lumina AI returned')
    .replace(/Gemini selected/gi, 'Lumina AI selected')
    .replace(/\bGemini\b/gi, 'Lumina AI');
}

function aiDecisionReason(ticket: ApiTicket): string {
  const routing = getRouting(ticket);
  const name = routing?.decision?.assignee_name || ticket.assigned_to_name || 'Unassigned';
  const role = routing?.decision?.assignee_job_title || ticket.assigned_to_job_title || '';
  const display = role ? `${name} · ${role}` : name;
  return luminaVoice(routing?.decision?.ticket_note?.rationale
    || routing?.decision?.rationale
    || routing?.reasoning
    || (ticket.assigned_to_name || routing?.decision?.assignee_name
      ? `Routed to ${display} because ${teamFor(ticket)} matches the ticket category and the current ownership/load profile is the best fit.`
      : `Recommended ${teamFor(ticket)} based on priority, category, and current queue ownership.`));
}

export type TicketSideRailProps = {
  ticket: ApiTicket | null;
  canChangePriority: boolean;
  canChangeStatus: boolean;
  changingPriority: boolean;
  changingStatus: boolean;
  onPriorityChange: (p: ApiTicket['priority']) => void;
  onStatusChange: (s: ApiTicket['status']) => void;
  ownerEyebrow: string;
  rightRailOpen: boolean;
  timelineEvents: TimelineEvent[];
  timelineLoading: boolean;
  assignmentTime: string;
};

export function TicketSideRail({
  ticket,
  canChangePriority,
  canChangeStatus,
  changingPriority,
  changingStatus,
  onPriorityChange,
  onStatusChange,
  ownerEyebrow,
  rightRailOpen,
  timelineEvents,
  timelineLoading,
  assignmentTime,
}: TicketSideRailProps) {
  const selectedRouting = getRouting(ticket);
  const selectedConfidence = confidenceScore(ticket);
  const routingPhase = ticket?.status === 'pending_routing'
    ? 'thinking'
    : ticket?.assigned_to_name
      ? 'assign'
      : 'read';

  return (
    <aside className="th-side-rail" aria-label="Ticket logs">
      {rightRailOpen && (
        <div className="th-side-content">
          <section className="th-queue-routing-card th-side-properties-card" aria-label="Selected ticket properties">
            <dl className="th-queue-routing-props">
              <div>
                <dt>Owner</dt>
                <dd>{ticket ? assigneeDisplay(ticket) : 'No ticket selected'}</dd>
              </div>
              {ticket && (
                <>
                  <div>
                    <dt>QA</dt>
                    <dd>{ticket.qa_assignee_name ? `${ticket.qa_assignee_name}${ticket.qa_assignee_job_title ? ` · ${ticket.qa_assignee_job_title}` : ''}` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Developer</dt>
                    <dd>{ticket.dev_assignee_name ? `${ticket.dev_assignee_name}${ticket.dev_assignee_job_title ? ` · ${ticket.dev_assignee_job_title}` : ''}` : '—'}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Priority</dt>
                <dd className="th-queue-property-control">
                  {ticket ? (
                    canChangePriority ? (
                      <select
                        className="th-property-select"
                        value={ticket.priority}
                        onChange={(event) => onPriorityChange(event.target.value as ApiTicket['priority'])}
                        disabled={changingPriority}
                        aria-label="Change ticket priority"
                      >
                        <option value="P1">P1 Critical</option>
                        <option value="P2">P2 High</option>
                        <option value="P3">P3 Medium</option>
                        <option value="P4">P4 Low</option>
                      </select>
                    ) : (
                      priorityLabel(ticket.priority)
                    )
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className="th-queue-property-control">
                  {ticket ? (
                    canChangeStatus ? (
                      <select
                        className="th-property-select th-property-select--status"
                        value={ticket.status}
                        onChange={(event) => onStatusChange(event.target.value as ApiTicket['status'])}
                        disabled={changingStatus}
                        aria-label="Change ticket status"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      formatTicketStatusLabel(ticket.status)
                    )
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{ticket ? humanize(ticket.type) : '—'}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{ticket?.category_name || '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{ticket ? formatDate(ticket.created_at) : '—'}</dd>
              </div>
              <div>
                <dt>Solved</dt>
                <dd>{ticket?.closed_at ? formatDate(ticket.closed_at) : '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="th-side-log-card th-side-ai-decision-log" aria-label="AI decision log">
            <header>
              <span><BrainCircuit size={15} /> AI Decision Log</span>
              <small>{humanize(routingPhase)}</small>
            </header>
            {ticket ? (
              <>
                <div className="th-routing-intel">
                  <div className="th-confidence-ring" style={{ '--score': `${selectedConfidence}%` } as CSSProperties}>
                    <strong>{selectedConfidence}%</strong>
                    <span>confidence</span>
                  </div>
                  <div className="th-routing-copy">
                    <span className="th-route-badge">{recommendationFor(ticket)}</span>
                    <p>{selectedRouting?.decision?.ticket_note?.summary || `Recommended lane: ${teamFor(ticket)}`}</p>
                  </div>
                </div>
                {(selectedRouting?.decision?.assignee_name || ticket.assigned_to_name) && (
                  <div className="th-routed-assignee">
                    <span>Routed to</span>
                    <strong>{selectedRouting?.decision?.assignee_name || assigneeLabel(ticket) || 'Unknown'}</strong>
                    {(selectedRouting?.decision?.assignee_job_title || assigneeRoleLabel(ticket)) ? (
                      <em>{selectedRouting?.decision?.assignee_job_title || assigneeRoleLabel(ticket)}</em>
                    ) : null}
                  </div>
                )}
                <div className="th-ai-decision">
                  <span>AI decision</span>
                  <p>{aiDecisionReason(ticket)}</p>
                </div>
              </>
            ) : (
              <p className="th-side-empty">Select a ticket to see routing context.</p>
            )}
          </section>

          {ticket && (
            <div className="th-assignment-box th-assignment-box--pinned">
              <span className="th-eyebrow">{ownerEyebrow} log</span>
              <AssigneeCell ticket={ticket} />
              <small>{formatDate(assignmentTime)}</small>
            </div>
          )}

          <TicketTimelinePanel
            events={timelineEvents}
            loading={timelineLoading}
          />
        </div>
      )}
    </aside>
  );
}

export default TicketSideRail;
