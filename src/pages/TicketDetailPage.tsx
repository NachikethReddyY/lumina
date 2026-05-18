import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Circle,
  Send,
  Play,
  RotateCcw,
  Star,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  GitBranch,
  Search,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  ticketsApi,
  type ApiTicket,
  type ApiComment,
  type ApiActivityEvent,
  type ApiRating,
} from '../utils/apiClient';
import { API_BASE_URL } from '../utils/apiBase';
import './TicketDetailPage.css';

const PRIORITY_COLOR: Record<ApiTicket['priority'], string> = {
  P1: '#cf2d56',
  P2: '#2563eb',
  P3: '#1f8a65',
  P4: '#807d72',
};

const STATUS_COLOR: Record<ApiTicket['status'], string> = {
  open: '#807d72',
  assigned: '#2563eb',
  in_progress: '#1f8a65',
  resolved: '#1f8a65',
  closed: '#a09c92',
  on_hold: '#c08532',
  pending_routing: '#dfa88f',
};

const ALL_STATUSES: ApiTicket['status'][] = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'on_hold',
  'pending_routing',
];

const ALL_PRIORITIES: ApiTicket['priority'][] = ['P1', 'P2', 'P3', 'P4'];

const QUEUE_STATUSES = new Set<ApiTicket['status']>([
  'open',
  'assigned',
  'in_progress',
  'on_hold',
  'pending_routing',
]);

const API_URL = API_BASE_URL;

type TicketRoutingMetadata = {
  source?: string;
  reasoning?: string;
  assigned_admin_id?: string | null;
  decision?: {
    assigned_admin_id?: string | null;
    assignee_name?: string | null;
    source?: string;
    confidence?: number;
    rationale?: string;
    reasoning?: string;
    steps?: Array<{ phase?: string; summary?: string }>;
    ticket_note?: {
      summary?: string;
      rationale?: string;
      next_step?: string;
    };
    [key: string]: unknown;
  } | null;
};

function humanize(value?: string | null): string {
  if (!value) return '';
  return value.replace(/_/g, ' ');
}

function titleCase(value?: string | null): string {
  const text = humanize(value);
  if (!text) return '';
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metaString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  if (value === null || value === undefined) return '';
  return String(value);
}

function routingSourceLabel(source?: string | null): string {
  if (source === 'gemini' || source === 'lumina_ai') return 'Lumina AI';
  if (source === 'rules') return 'Rule Engine';
  if (source === 'rules_fallback') return 'Lumina fallback';
  if (source === 'manual') return 'Manual';
  if (source === 'seed') return 'Seed JSON';
  return titleCase(source) || 'Routing';
}

function luminaVoice(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/Gemini AI/gi, 'Lumina AI')
    .replace(/Gemini fallback was used because:\s*/gi, 'Lumina AI used deterministic fallback because ')
    .replace(/Gemini routing request failed \(429\)/gi, 'the routing model was rate limited (429)')
    .replace(/Gemini routing request failed \((\d+)\)/gi, 'the routing model request failed ($1)')
    .replace(/Gemini API key/gi, 'Lumina AI routing key')
    .replace(/Gemini returned/gi, 'Lumina AI returned')
    .replace(/Gemini selected/gi, 'Lumina AI selected')
    .replace(/\bGemini\b/gi, 'Lumina AI');
}

function routePhaseClass(phase?: string): string {
  if (phase === 'thinking') return 'thinking';
  if (phase === 'read') return 'read';
  if (phase === 'assign' || phase === 'done') return 'done';
  return 'read';
}

function ticketCode(ticketId: string): string {
  return `LM-${ticketId.slice(0, 4).toUpperCase()}`;
}

function initials(name?: string | null): string {
  if (!name) return 'NA';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusIcon({ status }: { status: ApiTicket['status'] }) {
  if (status === 'resolved' || status === 'closed') return <CheckCircle2 size={14} />;
  if (status === 'in_progress') return <Play size={14} />;
  if (status === 'open' || status === 'pending_routing') return <AlertCircle size={14} />;
  return <Circle size={14} />;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function eventActor(event: ApiActivityEvent): string {
  const name = `${event.first_name || ''} ${event.last_name || ''}`.trim();
  return name || event.actor_email || 'Someone';
}

function formatEventText(event: ApiActivityEvent): string {
  const actor = eventActor(event);
  const metadata = event.metadata as Record<string, unknown> | undefined;
  const oldStatus = metaString(metadata, 'old_status');
  const newStatus = metaString(metadata, 'new_status') || metaString(metadata, 'status');
  const assignee = metaString(metadata, 'assigned_to_name');
  const oldAssignee = metaString(metadata, 'old_assigned_to_name');
  const source = metaString(metadata, 'source') || metaString(metadata, 'routing_source');

  switch (event.action) {
    case 'ticket_created':
      return `${actor} submitted this ticket for AI routing`;
    case 'ticket_assigned': {
      const routeCopy = source && source !== 'manual' ? ` via ${routingSourceLabel(source)}` : '';
      const statusCopy = oldStatus && newStatus
        ? `, moving status from ${humanize(oldStatus)} to ${humanize(newStatus)}`
        : '';
      return assignee
        ? `${actor} assigned this ticket to ${assignee}${routeCopy}${statusCopy}`
        : `${actor} assigned this ticket${routeCopy}${statusCopy}`;
    }
    case 'ticket_status_changed':
      if (oldStatus && newStatus) {
        return `${actor} changed status from ${humanize(oldStatus)} to ${humanize(newStatus)}`;
      }
      return newStatus ? `${actor} changed status to ${humanize(newStatus)}` : `${actor} updated status`;
    case 'ticket_priority_changed': {
      const newPriority = metaString(metadata, 'new_priority') || metaString(metadata, 'priority');
      return newPriority ? `${actor} changed priority to ${newPriority}` : `${actor} updated priority`;
    }
    case 'ticket_rerouted':
      return assignee
        ? `${actor} re-routed this ticket from ${oldAssignee || 'the previous owner'} to ${assignee} via ${routingSourceLabel(source)}`
        : `${actor} re-routed this ticket`;
    case 'ticket_comment_added':
      return `${actor} added a comment`;
    case 'ticket_comment_deleted':
      return `${actor} deleted a comment`;
    case 'ticket_rated': {
      const rating = metaString(metadata, 'rating');
      return rating ? `${actor} rated the resolution ${rating}/5` : `${actor} left a rating`;
    }
    default:
      return humanize(event.action);
  }
}

function eventDotColor(action: string): string {
  if (action.includes('created')) return '#9fbbe0';
  if (action.includes('assigned') || action.includes('rerouted')) return '#9fc9a2';
  if (action.includes('status')) return '#dfa88f';
  if (action.includes('priority')) return '#9fbbe0';
  if (action.includes('comment')) return '#c0a8dd';
  if (action.includes('rated')) return '#c08532';
  return '#9ca3af';
}

function StarRating({
  ticketId,
  existingRating,
  onRated,
}: {
  ticketId: string;
  existingRating: ApiRating | null;
  onRated: (r: ApiRating) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [editing, setEditing] = useState(!existingRating);

  const current = existingRating?.rating || 0;

  const handleRate = async (val: number) => {
    setSaving(true);
    try {
      const res = await ticketsApi.rate(ticketId, val, comment || undefined);
      if (res.ok) {
        const data = await res.json();
        onRated(data as ApiRating);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!editing && existingRating) {
    return (
      <div className="td-rating-display">
        <div className="td-rating-stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={18}
              fill={s <= existingRating.rating ? '#c08532' : 'none'}
              color={s <= existingRating.rating ? '#c08532' : '#8a867c'}
            />
          ))}
        </div>
        {existingRating.comment && <p className="td-rating-comment">{existingRating.comment}</p>}
        <button className="td-rating-edit-btn" onClick={() => setEditing(true)}>Edit rating</button>
      </div>
    );
  }

  return (
    <div className="td-rating-form">
      <p className="td-rating-prompt">How satisfied are you with the resolution?</p>
      <div className="td-rating-stars interactive">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            className="td-star-btn"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleRate(s)}
            disabled={saving}
            aria-label={`${s} star rating`}
          >
            <Star
              size={24}
              fill={(hovered || current) >= s ? '#c08532' : 'none'}
              color={(hovered || current) >= s ? '#c08532' : '#8a867c'}
            />
          </button>
        ))}
      </div>
      <textarea
        className="td-rating-comment-input"
        placeholder="Optional feedback..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
      {current > 0 && (
        <div className="td-rating-submit-row">
          <button className="td-action-btn success" onClick={() => handleRate(current)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Rating'}
          </button>
          {existingRating && <button className="td-action-btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      )}
    </div>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [ticket, setTicket] = useState<ApiTicket | null>(null);
  const [queueTickets, setQueueTickets] = useState<ApiTicket[]>([]);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [activityEvents, setActivityEvents] = useState<ApiActivityEvent[]>([]);
  const [rating, setRating] = useState<ApiRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [routingCollapsed, setRoutingCollapsed] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');
  const [queuePriority, setQueuePriority] = useState('all');
  const [queueStatus, setQueueStatus] = useState('all');
  const [queueCategory, setQueueCategory] = useState('all');
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isOwner = ticket?.submitted_by_id === user?.id;
  const canReopen = !isAdmin && isOwner && (ticket?.status === 'resolved' || ticket?.status === 'closed');
  const canResolve = !isAdmin && isOwner && ticket?.status === 'in_progress';
  const showRating = isOwner && (ticket?.status === 'resolved' || ticket?.status === 'closed');

  const reloadTicketData = useCallback(
    async (background = true) => {
      if (!id) return;
      if (!background) setLoading(true);

      try {
        const [ticketData, commentData, activityData, ticketListData] = await Promise.all([
          ticketsApi.get(id).then((r) => r.json()),
          ticketsApi.getComments(id).then((r) => r.json()),
          ticketsApi.getActivity(id).then((r) => r.json()),
          ticketsApi.list().then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);

        setTicket(ticketData as ApiTicket);
        setComments(Array.isArray(commentData) ? (commentData as ApiComment[]) : []);
        setQueueTickets(Array.isArray(ticketListData) ? (ticketListData as ApiTicket[]) : []);
        const { events, rating: r } = activityData as { events: ApiActivityEvent[]; rating: ApiRating | null };
        setActivityEvents(Array.isArray(events) ? events : []);
        setRating(r);
        setError('');
      } catch {
        if (!background) setError('Failed to load ticket');
      } finally {
        if (!background) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void reloadTicketData(false);
  }, [reloadTicketData]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(e.target as Node)) {
        setPriorityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!id) return;

    const interval = window.setInterval(() => {
      void reloadTicketData(true);
    }, 60_000);

    const handleRefresh = () => {
      void reloadTicketData(true);
    };

    window.addEventListener('ticket:activity-changed', handleRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('ticket:activity-changed', handleRefresh);
    };
  }, [id, reloadTicketData]);

  const emitActivityChange = () => {
    window.dispatchEvent(new CustomEvent('ticket:activity-changed', { detail: { ticketId: id } }));
  };

  const handleStatusChange = async (newStatus: ApiTicket['status']) => {
    if (!ticket || newStatus === ticket.status) return;
    setStatusDropdownOpen(false);
    const res = await ticketsApi.updateStatus(ticket.id, newStatus);
    if (res.ok) emitActivityChange();
  };

  const handlePriorityChange = async (newPriority: ApiTicket['priority']) => {
    if (!ticket || newPriority === ticket.priority) return;
    setPriorityDropdownOpen(false);
    const res = await ticketsApi.updatePriority(ticket.id, newPriority);
    if (res.ok) emitActivityChange();
  };

  const handleReroute = async () => {
    if (!ticket) return;
    const res = await ticketsApi.reroute(ticket.id);
    if (res.ok) emitActivityChange();
  };

  const handleComment = async () => {
    if (!ticket || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await ticketsApi.addComment(ticket.id, commentText.trim());
      if (res.ok) {
        setCommentText('');
        emitActivityChange();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!ticket) return;
    const ok = window.confirm('Delete this comment?');
    if (!ok) return;
    const res = await ticketsApi.deleteComment(ticket.id, commentId);
    if (res.ok) emitActivityChange();
  };

  const threadedComments = useMemo(
    () => [...comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [comments],
  );
  const sortedActivityEvents = useMemo(
    () => [...activityEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [activityEvents],
  );

  const queueCategories = useMemo(() => {
    const seen = new Map<string, string>();
    queueTickets.forEach((item) => {
      if (item.category_id && item.category_name) seen.set(item.category_id, item.category_name);
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [queueTickets]);

  const visibleQueueTickets = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    return queueTickets
      .filter((item) => QUEUE_STATUSES.has(item.status))
      .filter((item) => queuePriority === 'all' || item.priority === queuePriority)
      .filter((item) => queueStatus === 'all' || item.status === queueStatus)
      .filter((item) => queueCategory === 'all' || item.category_id === queueCategory)
      .filter((item) => {
        if (!q) return true;
        return `${ticketCode(item.id)} ${item.id} ${item.title} ${item.description} ${item.category_name} ${item.priority} ${humanize(item.status)}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 12);
  }, [queueTickets, queueSearch, queuePriority, queueStatus, queueCategory]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="td-loading-page">
          <div className="td-skeleton td-skeleton-title" />
          <div className="td-skeleton td-skeleton-body" />
          <div className="td-skeleton td-skeleton-body" style={{ width: '70%' }} />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !ticket) {
    return (
      <DashboardLayout>
        <div className="ticket-detail-error">
          <p>{error || 'Ticket not found'}</p>
          <button onClick={() => navigate(-1)}>Go back</button>
        </div>
      </DashboardLayout>
    );
  }

  const routing = ticket.metadata?.routing as TicketRoutingMetadata | undefined;
  const assignedName = ticket.assigned_to_name || null;
  const routingDecision = routing?.decision || null;
  const routingSteps = routingDecision?.steps?.length
    ? routingDecision.steps
    : [
        {
          phase: 'thinking',
          summary: `Analyzed ${titleCase(ticket.type)}, ${ticket.priority}, and ${ticket.category_name}.`,
        },
        {
          phase: 'read',
          summary: luminaVoice(routing?.reasoning) || 'Waiting for a routing decision to finish.',
        },
        {
          phase: 'assign',
          summary: assignedName ? `Assigned to ${assignedName}.` : 'No active assignee has been attached yet.',
        },
      ];
  const assignedInitials = initials(assignedName);
  const routingSource = routingSourceLabel(routing?.source);
  const hasRouting = Boolean(routing?.source || routing?.reasoning || routing?.assigned_admin_id);
  const routingPhase = ticket.status === 'pending_routing'
    ? 'thinking'
    : assignedName
      ? 'assign'
      : 'read';

  return (
    <DashboardLayout>
      <div className="ticket-detail-page">
        <div className="ticket-detail-header">
          <div className="td-header-left">
            <button className="td-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="td-header-search">
              <Search size={14} />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search tickets"
                aria-label="Search tickets"
              />
            </div>
            <div className="td-header-filters" aria-label="Ticket queue filters">
              <select value={queuePriority} onChange={(event) => setQueuePriority(event.target.value)} aria-label="Filter by priority">
                <option value="all">All priorities</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
              </select>
              <select value={queueStatus} onChange={(event) => setQueueStatus(event.target.value)} aria-label="Filter by status">
                <option value="all">All statuses</option>
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>{humanize(status)}</option>
                ))}
              </select>
              <select value={queueCategory} onChange={(event) => setQueueCategory(event.target.value)} aria-label="Filter by category">
                <option value="all">All categories</option>
                {queueCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="ticket-detail-layout">
          <aside className="td-queue-pane" aria-label="Ticket queue">
            <div className="td-queue-header">
              <span>Open · {visibleQueueTickets.length}</span>
            </div>
            <div className="td-queue-list">
              {visibleQueueTickets.map((item) => (
                <button
                  key={item.id}
                  className={`td-queue-item ${item.id === ticket.id ? 'active' : ''}`}
                  onClick={() => navigate(`/tickets/${item.id}`)}
                >
                  <span className="td-queue-topline">
                    <span
                      className="td-queue-priority"
                      style={{ background: `${PRIORITY_COLOR[item.priority]}14`, color: PRIORITY_COLOR[item.priority] }}
                    >
                      {item.priority}
                    </span>
                    <span className="td-queue-code">{ticketCode(item.id)}</span>
                  </span>
                  <span className="td-queue-title">{item.title}</span>
                  <span
                    className="td-queue-status"
                    style={{ background: `${STATUS_COLOR[item.status]}2a` }}
                  >
                    {humanize(item.status)}
                  </span>
                </button>
              ))}
              {visibleQueueTickets.length === 0 && (
                <div className="td-queue-empty">No active tickets</div>
              )}
            </div>
          </aside>

          <main className="ticket-detail-main">
            <motion.div
              className="td-main-inner"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <section className="td-ticket-hero">
                <div className="td-title-row">
                  <span
                    className="td-priority-pill"
                    style={{ background: `${PRIORITY_COLOR[ticket.priority]}14`, color: PRIORITY_COLOR[ticket.priority] }}
                  >
                    {ticket.priority}
                  </span>
                  <span className="td-ticket-code">{ticketCode(ticket.id)}</span>
                  <span
                    className="td-status-pill"
                    style={{ background: `${STATUS_COLOR[ticket.status]}24`, color: STATUS_COLOR[ticket.status] }}
                  >
                    {humanize(ticket.status)}
                  </span>
                </div>

                <h1 className="td-title">{ticket.title}</h1>
                <p className="td-description">{ticket.description}</p>
              </section>

              <section className="td-meta-grid" aria-label="Ticket metadata">
                <div className="td-meta-cell">
                  <span>Type</span>
                  <strong>{titleCase(ticket.type)}</strong>
                </div>
                <div className="td-meta-cell">
                  <span>Category</span>
                  <strong>{ticket.category_name}</strong>
                </div>
                <div className="td-meta-cell">
                  <span>Created</span>
                  <strong>{timeAgo(ticket.created_at)}</strong>
                </div>
                <div className="td-meta-cell">
                  <span>Assigned To</span>
                  <strong>{ticket.assigned_to_name || '-'}</strong>
                </div>
              </section>

              {ticket.replication_steps && (
                <section className="td-replication-section">
                  <h2>Replication Steps</h2>
                  <pre className="td-pre">{ticket.replication_steps}</pre>
                </section>
              )}

              <section className="td-action-bar" aria-label="Ticket actions">
                {isAdmin && (
                  <>
                    {(ticket.status === 'open' || ticket.status === 'assigned') && (
                      <button className="td-action-btn primary" onClick={() => handleStatusChange('in_progress')}>
                        <Play size={14} />
                        Start Task
                      </button>
                    )}
                    {ticket.status === 'in_progress' && (
                      <button className="td-action-btn success" onClick={() => handleStatusChange('resolved')}>
                        <CheckCircle2 size={14} />
                        Resolve
                      </button>
                    )}
                    <button className="td-action-btn ghost" onClick={handleReroute}>
                      <RotateCcw size={14} />
                      Re-route
                    </button>
                  </>
                )}
                {canReopen && (
                  <button className="td-action-btn ghost" onClick={() => handleStatusChange('open')}>
                    <RotateCcw size={14} />
                    Reopen Ticket
                  </button>
                )}
                {canResolve && (
                  <button className="td-action-btn success" onClick={() => handleStatusChange('resolved')}>
                    <CheckCircle2 size={14} />
                    Mark Resolved
                  </button>
                )}
              </section>

              <section className="td-comments-section">
                <div className="td-section-heading">
                  <MessageSquare size={15} />
                  <h2>Comments</h2>
                </div>

                <div className="td-comment-form">
                  <div className="td-comment-form-avatar">
                    {user?.avatar_url
                      ? <img src={`${API_URL}${user.avatar_url}`} alt="" />
                      : <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                    }
                  </div>
                  <div className="td-comment-input-wrap">
                    <textarea
                      ref={commentInputRef}
                      className="td-comment-input"
                      placeholder="Add a comment... (Shift+Enter to submit)"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.shiftKey) {
                          e.preventDefault();
                          handleComment();
                        }
                      }}
                      rows={3}
                    />
                    <button
                      className="td-comment-submit"
                      onClick={handleComment}
                      disabled={submitting || !commentText.trim()}
                    >
                      <Send size={14} />
                      {submitting ? 'Sending...' : 'Comment'}
                    </button>
                  </div>
                </div>

                <div className="td-comment-thread">
                  {threadedComments.length === 0 ? (
                    <p className="td-comment-thread-empty">No comments yet.</p>
                  ) : (
                    threadedComments.map((comment) => {
                      const canDeleteComment = isAdmin || comment.author_id === user?.id;
                      return (
                        <div key={comment.id} className="td-comment-item">
                          <div className="td-comment-avatar">
                            {comment.avatar_url
                              ? <img src={`${API_URL}${comment.avatar_url}`} alt="" />
                              : <span>{comment.first_name[0]}{comment.last_name[0]}</span>
                            }
                          </div>
                          <div className="td-comment-body">
                            <div className="td-comment-header">
                              <strong>{comment.first_name} {comment.last_name}</strong>
                              <span className={`td-comment-role ${comment.role}`}>{humanize(comment.role)}</span>
                              <span className="td-activity-time">{timeAgo(comment.created_at)}</span>
                              {canDeleteComment && (
                                <button
                                  type="button"
                                  className="td-comment-delete"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                            <p>{comment.body}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </motion.div>
          </main>

          <aside className="ticket-detail-right-rail">
            <section className={`td-rail-panel td-routing-panel ${routingCollapsed ? 'collapsed' : ''}`}>
              <div className="td-rail-heading">
                <div>
                  <h2>AI Routing Engine</h2>
                  <span className="td-route-live"><span /> live</span>
                </div>
                <strong className="td-routing-phase-label">{routingPhase}</strong>
                <button
                  className="td-rail-icon-btn"
                  onClick={() => setRoutingCollapsed((value) => !value)}
                  aria-label={routingCollapsed ? 'Expand routing panel' : 'Collapse routing panel'}
                >
                  {routingCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>

              <AnimatePresence initial={false}>
                {!routingCollapsed && (
                  <motion.div
                    className="td-routing-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="td-routing-steps">
                      {routingSteps.map((step, index) => (
                        <div className="td-routing-step" key={`${step.phase || 'step'}-${index}`}>
                          <span className={`td-route-pill ${routePhaseClass(step.phase)}`}>
                            {step.phase ? titleCase(step.phase) : `Step ${index + 1}`}
                          </span>
                          <p>{luminaVoice(step.summary) || 'Routing step recorded.'}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="td-routing-result">
                <span>Assigned To</span>
                <div className="td-assignee-row">
                  <div className="td-assignee-avatar">
                    {ticket.assigned_to_avatar_url
                      ? <img src={`${API_URL}${ticket.assigned_to_avatar_url}`} alt="" />
                      : assignedInitials}
                  </div>
                  <div>
                    <strong>{assignedName || 'Unassigned'}</strong>
                    <small>{ticket.category_name} · {humanize(ticket.status)}</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="td-rail-panel td-properties-panel">
              <div className="td-rail-heading">
                <h2>Properties</h2>
              </div>
              <div className="td-property-list">
                <div className="td-property-row">
                  <span>Status</span>
                  {isAdmin ? (
                    <div className="tds-status-dropdown" ref={statusDropdownRef}>
                      <button
                        className="tds-status-btn"
                        style={{ color: STATUS_COLOR[ticket.status] }}
                        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                      >
                        <StatusIcon status={ticket.status} />
                        {humanize(ticket.status)}
                        <ChevronDown size={12} />
                      </button>
                      {statusDropdownOpen && (
                        <div className="tds-status-menu">
                          {ALL_STATUSES.map((status) => (
                            <button
                              key={status}
                              className={`tds-status-option ${status === ticket.status ? 'active' : ''}`}
                              style={{ color: STATUS_COLOR[status] }}
                              onClick={() => handleStatusChange(status)}
                            >
                              <span className="tds-status-dot" style={{ background: STATUS_COLOR[status] }} />
                              {humanize(status)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <strong style={{ color: STATUS_COLOR[ticket.status] }}>{humanize(ticket.status)}</strong>
                  )}
                </div>
                <div className="td-property-row">
                  <span>Priority</span>
                  {isAdmin ? (
                    <div className="tds-status-dropdown" ref={priorityDropdownRef}>
                      <button
                        className="tds-status-btn"
                        style={{ color: PRIORITY_COLOR[ticket.priority] }}
                        onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                      >
                        {ticket.priority}
                        <ChevronDown size={12} />
                      </button>
                      {priorityDropdownOpen && (
                        <div className="tds-status-menu">
                          {ALL_PRIORITIES.map((priority) => (
                            <button
                              key={priority}
                              className={`tds-status-option ${priority === ticket.priority ? 'active' : ''}`}
                              style={{ color: PRIORITY_COLOR[priority] }}
                              onClick={() => handlePriorityChange(priority)}
                            >
                              <span className="tds-status-dot" style={{ background: PRIORITY_COLOR[priority] }} />
                              {priority}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <strong style={{ color: PRIORITY_COLOR[ticket.priority] }}>{ticket.priority}</strong>
                  )}
                </div>
                <div className="td-property-row">
                  <span>Submitted By</span>
                  <strong title={ticket.submitted_by_email}>{ticket.submitted_by_email}</strong>
                </div>
                <div className="td-property-row">
                  <span>Routing</span>
                  <strong>{hasRouting ? routingSource : 'Pending'}</strong>
                </div>
              </div>
            </section>

            <section className="td-rail-panel td-activity-panel">
              <div className="td-rail-heading">
                <div>
                  <h2>Activity</h2>
                  <span className="td-rail-subtitle">Full lifecycle</span>
                </div>
                <GitBranch size={16} />
              </div>

              <div className="td-timeline">
                {sortedActivityEvents.map((event) => (
                  <div key={event.id} className="td-timeline-item">
                    <div
                      className="td-timeline-dot"
                      style={{ background: eventDotColor(event.action) }}
                    />
                    <div className="td-timeline-line" />
                    <div className="td-timeline-content">
                      <span className="td-activity-text">{formatEventText(event)}</span>
                      <span className="td-activity-time">{timeAgo(event.created_at)}</span>
                    </div>
                  </div>
                ))}
                {!sortedActivityEvents.some((event) => event.action === 'ticket_created') && (
                  <div className="td-timeline-item">
                    <div className="td-timeline-dot" style={{ background: '#9fbbe0' }} />
                    <div className="td-timeline-line" />
                    <div className="td-timeline-content">
                      <span className="td-activity-text">
                        Ticket created by <strong>{ticket.submitted_by_email}</strong>
                      </span>
                      <span className="td-activity-time">{timeAgo(ticket.created_at)}</span>
                    </div>
                  </div>
                )}

                {showRating && (
                  <div className="td-rating-section">
                    <div className="td-rating-header">
                      <Star size={14} />
                      <span>Satisfaction Rating</span>
                    </div>
                    <StarRating
                      ticketId={ticket.id}
                      existingRating={rating}
                      onRated={(r) => {
                        setRating(r);
                        emitActivityChange();
                      }}
                    />
                  </div>
                )}
                {!showRating && rating && (
                  <div className="td-timeline-item">
                    <div className="td-timeline-dot" style={{ background: '#c08532' }} />
                    <div className="td-timeline-content">
                      <span className="td-activity-text">
                        Rated {rating.rating}/5 by {rating.first_name || 'the requester'}
                        {rating.comment ? ` - "${rating.comment}"` : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default TicketDetailPage;
