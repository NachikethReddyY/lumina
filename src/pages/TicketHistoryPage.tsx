import { useEffect, useMemo, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Circle,
  X,
  Send,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  RotateCcw,
  BrainCircuit,
  FileText,
  Activity,
  UserCircle2,
  ClipboardList,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from '../context/useToast';
import { ticketsApi, categoriesApi, type ApiTicket, type ApiCategory, type ApiActivityEvent, type ApiComment } from '../utils/apiClient';
import { apiAssetUrl } from '../utils/apiBase';
import './TicketHistoryPage.css';

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

const STATUS_OPTIONS: Array<{ value: ApiTicket['status']; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'pending_routing', label: 'Pending routing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PAGE_SIZE = 12;
const QUEUE_STATUSES = new Set<ApiTicket['status']>(['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing']);
const COMPLETED_STATUSES = new Set<ApiTicket['status']>(['resolved', 'closed']);

type TicketHistoryMode = 'queue' | 'history';
type TicketTab = 'active' | 'all' | 'done';
type RoutingStep = { phase?: string; summary?: string };
type RoutingDecision = {
  confidence?: number;
  assignee_name?: string | null;
  rationale?: string;
  steps?: RoutingStep[];
  ticket_note?: {
    summary?: string;
    rationale?: string;
    next_step?: string;
  };
};
type RoutingMetadata = {
  source?: string;
  reasoning?: string;
  assigned_admin_id?: string | null;
  decision?: RoutingDecision | null;
};
type TimelineTone = 'green' | 'red' | 'yellow' | 'purple' | 'blue' | 'gray';
type TimelineEvent = {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  time: string;
  occurredAt: number;
  order: number;
  tone: TimelineTone;
};

function humanize(value?: string | null): string {
  if (!value) return '';
  return value.replace(/_/g, ' ');
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

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function assigneeLabel(ticket: ApiTicket) {
  if (ticket.assigned_to_name) return ticket.assigned_to_name;
  const routing = ticket.metadata?.routing as { assigned_admin_id?: string; source?: string } | undefined;
  if (ticket.status === 'pending_routing') return 'Pending routing';
  if (routing?.assigned_admin_id) return 'Assignment missing';
  return 'Unassigned';
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function ticketTabForMode(mode: TicketHistoryMode): TicketTab {
  return mode === 'queue' ? 'active' : 'done';
}

function ticketMatchesTab(ticket: ApiTicket, tab: TicketTab): boolean {
  if (tab === 'active') return QUEUE_STATUSES.has(ticket.status);
  if (tab === 'done') return COMPLETED_STATUSES.has(ticket.status);
  return true;
}

function paginationBlocks(page: number, totalPages: number): Array<number | 'ellipsis-start' | 'ellipsis-end'> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const blocks = new Set([1, totalPages, page]);
  if (page > 2) blocks.add(page - 1);
  if (page < totalPages - 1) blocks.add(page + 1);

  const ordered = [...blocks].sort((a, b) => a - b);
  return ordered.flatMap((block, index) => {
    const previous = ordered[index - 1];
    if (index > 0 && block - previous > 1) {
      return [block === totalPages ? 'ellipsis-end' : 'ellipsis-start', block];
    }
    return [block];
  });
}

function ticketCode(ticket: ApiTicket): string {
  return `LM-${ticket.id.slice(0, 3).toUpperCase()}`;
}

function ticketWorkspacePath(mode: TicketHistoryMode, ticketId?: string): string {
  if (mode === 'history') return ticketId ? `/tickets/history/${ticketId}` : '/tickets/history';
  return ticketId ? `/tickets/${ticketId}` : '/tickets';
}

function getRouting(ticket?: ApiTicket | null): RoutingMetadata | null {
  return (ticket?.metadata?.routing as RoutingMetadata | undefined) || null;
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

function priorityLabel(priority: ApiTicket['priority']): string {
  if (priority === 'P1') return 'Critical';
  if (priority === 'P2') return 'High';
  if (priority === 'P3') return 'Medium';
  return 'Low';
}

function activityActor(event: ApiActivityEvent): string {
  return `${event.first_name || ''} ${event.last_name || ''}`.trim() || event.actor_email || 'Someone';
}

function metadataText(metadata: Record<string, unknown> | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
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

function statusTone(status: string): TimelineTone {
  if (status === 'resolved') return 'green';
  if (status === 'closed') return 'red';
  if (status === 'on_hold' || status === 'pending_routing') return 'yellow';
  if (status === 'assigned' || status === 'in_progress') return 'purple';
  return 'gray';
}

function activityTimelineEvents(ticket: ApiTicket, event: ApiActivityEvent): TimelineEvent[] {
  const actor = activityActor(event);
  const metadata = event.metadata || {};
  const time = timeAgo(event.created_at);
  const occurredAt = new Date(event.created_at).getTime();
  const id = event.id || `${event.action}-${event.created_at}`;
  const assignedTo = metadataText(metadata, 'assigned_to_name') || assigneeLabel(ticket);
  const oldAssignee = metadataText(metadata, 'old_assigned_to_name');
  const routingReason = luminaVoice(metadataText(metadata, 'routing_reasoning') || metadataText(metadata, 'reasoning'));

  if (event.action === 'ticket_created') {
    const priority = metadataText(metadata, 'priority') || ticket.priority;
    return [{
      id,
      icon: ClipboardList,
      title: 'Ticket created',
      detail: `${actor} opened ${ticketCode(ticket)} as ${priorityLabel(priority as ApiTicket['priority'])} priority.`,
      time,
      occurredAt,
      order: 0,
      tone: 'green',
    }];
  }

  if (event.action === 'ticket_rerouted') {
    return [
      {
        id: `${id}-request`,
        icon: RotateCcw,
        title: 'Reroute requested',
        detail: `${actor} requested rerouting from ${oldAssignee || 'the current owner'} to Lumina AI review.`,
        time,
        occurredAt,
        order: 1,
        tone: 'purple',
      },
      {
        id: `${id}-ai`,
        icon: BrainCircuit,
        title: 'AI reroute completed',
        detail: `Lumina AI rerouted ${ticketCode(ticket)} from ${oldAssignee || 'the previous owner'} to ${assignedTo}.${routingReason ? ` ${routingReason}` : ''}`,
        time,
        occurredAt,
        order: 2,
        tone: 'purple',
      },
    ];
  }

  if (event.action === 'ticket_assigned') {
    const source = metadataText(metadata, 'source') || metadataText(metadata, 'routing_source');
    const viaAI = source && source !== 'manual';
    return [{
      id,
      icon: viaAI ? BrainCircuit : UserCircle2,
      title: viaAI ? 'AI owner selected' : 'Owner assigned',
      detail: viaAI
        ? `Lumina AI routed ${ticketCode(ticket)} to ${assignedTo}.${routingReason ? ` ${routingReason}` : ''}`
        : `${actor} assigned ${ticketCode(ticket)} to ${assignedTo}.`,
      time,
      occurredAt,
      order: 1,
      tone: viaAI ? 'purple' : 'blue',
    }];
  }

  if (event.action === 'ticket_priority_changed') {
    const oldPriority = metadataText(metadata, 'old_priority') || 'previous priority';
    const newPriority = metadataText(metadata, 'new_priority') || metadataText(metadata, 'priority') || ticket.priority;
    return [{
      id,
      icon: Activity,
      title: 'Priority changed',
      detail: `${actor} changed priority from ${oldPriority} to ${newPriority}.`,
      time,
      occurredAt,
      order: 1,
      tone: 'yellow',
    }];
  }

  if (event.action === 'ticket_status_changed') {
    const oldStatus = metadataText(metadata, 'old_status') || 'previous status';
    const newStatus = metadataText(metadata, 'new_status') || metadataText(metadata, 'status') || ticket.status;
    return [{
      id,
      icon: CheckCircle2,
      title: 'Status changed',
      detail: `${actor} moved status from ${humanize(oldStatus)} to ${humanize(newStatus)}.`,
      time,
      occurredAt,
      order: 1,
      tone: statusTone(newStatus),
    }];
  }

  if (event.action === 'ticket_comment_added' || event.action === 'ticket_comment_deleted') {
    return [{
      id,
      icon: FileText,
      title: event.action === 'ticket_comment_added' ? 'Comment added' : 'Comment removed',
      detail: `${actor} ${event.action === 'ticket_comment_added' ? 'added' : 'removed'} a ticket comment.`,
      time,
      occurredAt,
      order: 1,
      tone: event.action === 'ticket_comment_added' ? 'blue' : 'red',
    }];
  }

  if (event.action === 'ticket_rated') {
    const rating = metadata.rating;
    return [{
      id,
      icon: CheckCircle2,
      title: 'Ticket rated',
      detail: `${actor} rated the completed ticket${typeof rating === 'number' ? ` ${rating}/5` : ''}.`,
      time,
      occurredAt,
      order: 1,
      tone: 'green',
    }];
  }

  return [{
    id,
    icon: Activity,
    title: humanize(event.action),
    detail: `${actor} updated ${ticketCode(ticket)}.`,
    time,
    occurredAt,
    order: 0,
    tone: 'gray',
  }];
}

function aiDecisionReason(ticket: ApiTicket): string {
  const routing = getRouting(ticket);
  const assignee = assigneeLabel(ticket);
  return luminaVoice(routing?.decision?.ticket_note?.rationale
    || routing?.decision?.rationale
    || routing?.reasoning
    || (ticket.assigned_to_name
      ? `Routed to ${assignee} because ${teamFor(ticket)} matches the ticket category and the current ownership/load profile is the best fit.`
      : `Recommended ${teamFor(ticket)} based on priority, category, and current queue ownership.`));
}

function recommendationFor(ticket: ApiTicket): string {
  if (ticket.status === 'pending_routing') return 'Route immediately';
  if (ticket.priority === 'P1') return 'Expedite review';
  if (ticket.status === 'resolved' || ticket.status === 'closed') return 'Archive with learnings';
  return 'Continue owner follow-up';
}

function teamFor(ticket: ApiTicket): string {
  if (ticket.category_name) return ticket.category_name;
  if (ticket.type === 'hardware') return 'Hardware Support';
  if (ticket.type === 'software') return 'Software Support';
  return 'Bug Triage';
}

function fallbackTimelineEvents(ticket: ApiTicket): TimelineEvent[] {
  const routing = getRouting(ticket);
  const events: TimelineEvent[] = [
    {
      id: `${ticket.id}-created`,
      icon: ClipboardList,
      title: 'Ticket created',
      detail: `${ticket.submitted_by_email} opened ${ticketCode(ticket)} as ${priorityLabel(ticket.priority)} priority.`,
      time: timeAgo(ticket.created_at),
      occurredAt: new Date(ticket.created_at).getTime(),
      order: 0,
      tone: 'green',
    },
  ];

  if (routing?.source || routing?.assigned_admin_id) {
    events.push({
      id: `${ticket.id}-routing`,
      icon: BrainCircuit,
      title: 'AI routing evaluated',
      detail: luminaVoice(routing.reasoning) || `Lumina evaluated ${teamFor(ticket)} ownership and current queue pressure.`,
      time: timeAgo(ticket.created_at),
      occurredAt: new Date(ticket.created_at).getTime(),
      order: 1,
      tone: 'purple',
    });
  }

  if (ticket.assigned_to_name) {
    events.push({
      id: `${ticket.id}-owner`,
      icon: UserCircle2,
      title: 'Owner assigned',
      detail: `${ticket.assigned_to_name} is the current operator for this ticket.`,
      time: timeAgo(ticket.created_at),
      occurredAt: new Date(ticket.created_at).getTime(),
      order: 2,
      tone: 'blue',
    });
  }

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    events.push({
      id: `${ticket.id}-${ticket.status}`,
      icon: CheckCircle2,
      title: humanize(ticket.status),
      detail: `Ticket is marked ${humanize(ticket.status)} and visible in completed history.`,
      time: timeAgo(ticket.created_at),
      occurredAt: new Date(ticket.created_at).getTime(),
      order: 3,
      tone: statusTone(ticket.status),
    });
  }

  return events;
}

function sortTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const timeDiff = b.occurredAt - a.occurredAt;
    if (timeDiff !== 0) return timeDiff;
    return b.order - a.order;
  });
}

function timelineEvents(ticket: ApiTicket, activityEvents: ApiActivityEvent[]): TimelineEvent[] {
  const auditTimeline = activityEvents.flatMap((event) => activityTimelineEvents(ticket, event));
  if (!auditTimeline.length) return sortTimelineEvents(fallbackTimelineEvents(ticket));

  const actions = new Set(activityEvents.map((event) => event.action));
  const fallbackTimeline = fallbackTimelineEvents(ticket).filter((event) => {
    if (event.id.endsWith('-created')) return !actions.has('ticket_created');
    if (event.id.endsWith('-routing') || event.id.endsWith('-owner')) {
      return !actions.has('ticket_assigned') && !actions.has('ticket_rerouted');
    }
    return true;
  });
  return sortTimelineEvents([...fallbackTimeline, ...auditTimeline]);
}

function AssigneeCell({ ticket }: { ticket: ApiTicket }) {
  const name = assigneeLabel(ticket);
  return (
    <div className="th-person-cell">
      <span className="th-person-avatar">
        {ticket.assigned_to_avatar_url ? <img src={apiAssetUrl(ticket.assigned_to_avatar_url)} alt="" /> : initials(name)}
      </span>
      <span>{name}</span>
    </div>
  );
}

function commentAuthorName(comment: ApiComment): string {
  return `${comment.first_name || ''} ${comment.last_name || ''}`.trim() || comment.email;
}

export function TicketHistoryPage({ mode = 'history' }: { mode?: TicketHistoryMode }) {
  const { user } = useCurrentUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id: routeTicketId } = useParams<{ id?: string }>();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TicketTab>(() => ticketTabForMode(mode));
  const [selectedTicketId, setSelectedTicketId] = useState<string>(routeTicketId || '');
  const [rightRailOpen, setRightRailOpen] = useState(() => localStorage.getItem('lumina.ticketHistory.rightRailOpen') !== 'false');
  const [reroutingTicket, setReroutingTicket] = useState(false);
  const [changingPriority, setChangingPriority] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [activityByTicket, setActivityByTicket] = useState<Record<string, ApiActivityEvent[]>>({});
  const [activityLoading, setActivityLoading] = useState(false);
  const [commentsByTicket, setCommentsByTicket] = useState<Record<string, ApiComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  useEffect(() => {
    setActiveTab(ticketTabForMode(mode));
    setFilterStatus('all');
    setPage(1);
  }, [mode]);

  useEffect(() => {
    setSelectedTicketId(routeTicketId || '');
  }, [routeTicketId]);

  useEffect(() => {
    localStorage.setItem('lumina.ticketHistory.rightRailOpen', String(rightRailOpen));
  }, [rightRailOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketsRes, catRes] = await Promise.all([ticketsApi.list(), categoriesApi.list()]);
        const [ticketsBody, catBody] = await Promise.all([ticketsRes.json(), catRes.json()]);
        if (cancelled) return;
        setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
        setCategories(Array.isArray(catBody) ? catBody : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const resetPage = useCallback(() => setPage(1), []);

  const scopedTickets = useMemo(
    () => mode === 'history'
      ? tickets.filter((ticket) => COMPLETED_STATUSES.has(ticket.status))
      : tickets.filter((ticket) => QUEUE_STATUSES.has(ticket.status)),
    [tickets, mode]
  );

  const tabbedTickets = useMemo(
    () => mode === 'queue'
      ? scopedTickets
      : scopedTickets.filter((ticket) => ticketMatchesTab(ticket, activeTab)),
    [scopedTickets, activeTab, mode]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabbedTickets.filter((ticket) => {
      if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
      if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && ticket.category_id !== filterCategory) return false;
      const code = ticketCode(ticket);
      if (q && !`${code} ${ticket.id} ${ticket.title} ${ticket.description} ${ticket.category_name} ${ticket.status} ${ticket.priority} ${assigneeLabel(ticket)}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tabbedTickets, filterStatus, filterPriority, filterCategory, search]);

  const sorted = useMemo(() => {
    const priorityRank: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    return [...filtered].sort((a, b) => {
      const priorityDiff = (priorityRank[a.priority] || 99) - (priorityRank[b.priority] || 99);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered]);

  useEffect(() => {
    if (!selectedTicketId) return;
    if (!scopedTickets.length) {
      if (selectedTicketId) setSelectedTicketId('');
      return;
    }
    if (!scopedTickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId('');
    }
  }, [scopedTickets, selectedTicketId]);

  const selectedTicket = selectedTicketId
    ? scopedTickets.find((ticket) => ticket.id === selectedTicketId) || null
    : null;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageBlocks = useMemo(() => paginationBlocks(page, totalPages), [page, totalPages]);
  const selectedRouting = getRouting(selectedTicket);
  const selectedConfidence = confidenceScore(selectedTicket);
  const selectedActivityEvents = selectedTicket ? activityByTicket[selectedTicket.id] || [] : [];
  const selectedTimeline = selectedTicket ? timelineEvents(selectedTicket, selectedActivityEvents) : [];
  const selectedComments = selectedTicket ? commentsByTicket[selectedTicket.id] || [] : [];
  const selectedAssignmentEvent = [...selectedActivityEvents]
    .reverse()
    .find((event) => event.action === 'ticket_assigned' || event.action === 'ticket_rerouted');
  const selectedAssignmentTime = selectedAssignmentEvent?.created_at || selectedTicket?.created_at || '';
  const routingPhase = selectedTicket?.status === 'pending_routing'
    ? 'thinking'
    : selectedTicket?.assigned_to_name
      ? 'assign'
      : 'read';

  const refreshActivity = useCallback(async (ticketId: string, silent = false) => {
    if (!silent) setActivityLoading(true);
    try {
      const res = await ticketsApi.getActivity(ticketId);
      const data = (await res.json().catch(() => ({}))) as { events?: ApiActivityEvent[] };
      if (!res.ok) return;
      setActivityByTicket((current) => ({
        ...current,
        [ticketId]: Array.isArray(data.events) ? data.events : [],
      }));
    } finally {
      if (!silent) setActivityLoading(false);
    }
  }, []);

  const refreshComments = useCallback(async (ticketId: string, silent = false) => {
    if (!silent) setCommentsLoading(true);
    try {
      const res = await ticketsApi.getComments(ticketId);
      const data = (await res.json().catch(() => [])) as ApiComment[];
      if (!res.ok) return;
      setCommentsByTicket((current) => ({
        ...current,
        [ticketId]: Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          : [],
      }));
    } finally {
      if (!silent) setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTicket?.id) {
      setActivityLoading(false);
      setCommentsLoading(false);
      return;
    }
    void refreshActivity(selectedTicket.id);
    void refreshComments(selectedTicket.id);
    setCommentDraft('');
  }, [refreshActivity, refreshComments, selectedTicket?.id]);

  const counts = useMemo(() => ({
    active: scopedTickets.filter((ticket) => QUEUE_STATUSES.has(ticket.status)).length,
    all: scopedTickets.length,
    done: scopedTickets.filter((ticket) => COMPLETED_STATUSES.has(ticket.status)).length,
  }), [scopedTickets]);

  const pageTitle = mode === 'queue' ? 'Ticket Queue' : 'Ticket History';
  const pageSubtitle = mode === 'history'
    ? 'Completed ticket records with inline inspection'
    : user?.role === 'user'
      ? 'Your tickets in one compact workspace'
      : 'All active ticket records with inline inspection';

  const changeTab = (tab: TicketTab) => {
    setActiveTab(tab);
    setPage(1);
  };
  const isRegularUser = user?.role === 'user';
  const canReroute = Boolean(selectedTicket && user?.role !== 'user');
  const canChangePriority = Boolean(selectedTicket && user?.role !== 'user');
  const canChangeStatus = Boolean(selectedTicket && (user?.role !== 'user' || selectedTicket.assigned_to_id === user?.id));
  const canComment = Boolean(selectedTicket && (user?.role !== 'user' || selectedTicket.submitted_by_id === user?.id));
  const ownerEyebrow = isRegularUser ? 'support owner' : 'assigned';

  const handlePriorityChange = useCallback(async (priority: ApiTicket['priority']) => {
    if (!selectedTicket || !canChangePriority || selectedTicket.priority === priority || changingPriority) return;
    setChangingPriority(true);
    try {
      const res = await ticketsApi.updatePriority(selectedTicket.id, priority);
      const data = (await res.json().catch(() => ({}))) as { error?: string; priority?: ApiTicket['priority'] };
      if (!res.ok) {
        showToast(data.error || 'Could not change ticket priority.', 'error');
        return;
      }

      const nextPriority = data.priority || priority;
      setTickets((current) => current.map((ticket) => (
        ticket.id === selectedTicket.id ? { ...ticket, priority: nextPriority } : ticket
      )));
      const refreshed = await ticketsApi.list();
      const body = await refreshed.json().catch(() => []);
      if (Array.isArray(body)) setTickets(body);
      await refreshActivity(selectedTicket.id, true);
      showToast(`Priority changed to ${nextPriority}.`, 'success');
    } catch {
      showToast('Could not change ticket priority.', 'error');
    } finally {
      setChangingPriority(false);
    }
  }, [canChangePriority, changingPriority, refreshActivity, selectedTicket, showToast]);

  const handleStatusChange = useCallback(async (status: ApiTicket['status']) => {
    if (!selectedTicket || !canChangeStatus || selectedTicket.status === status || changingStatus) return;
    setChangingStatus(true);
    try {
      const res = await ticketsApi.updateStatus(selectedTicket.id, status);
      const data = (await res.json().catch(() => ({}))) as { error?: string; status?: ApiTicket['status'] };
      if (!res.ok) {
        showToast(data.error || 'Could not change ticket status.', 'error');
        return;
      }

      const nextStatus = data.status || status;
      setTickets((current) => current.map((ticket) => (
        ticket.id === selectedTicket.id ? { ...ticket, status: nextStatus } : ticket
      )));
      const refreshed = await ticketsApi.list();
      const body = await refreshed.json().catch(() => []);
      if (Array.isArray(body)) setTickets(body);
      await refreshActivity(selectedTicket.id, true);
      showToast(`Status changed to ${humanize(nextStatus)}.`, 'success');
    } catch {
      showToast('Could not change ticket status.', 'error');
    } finally {
      setChangingStatus(false);
    }
  }, [canChangeStatus, changingStatus, refreshActivity, selectedTicket, showToast]);

  const handleAddComment = useCallback(async () => {
    if (!selectedTicket || !canComment || !commentDraft.trim() || commentSending) return;
    setCommentSending(true);
    try {
      const res = await ticketsApi.addComment(selectedTicket.id, commentDraft.trim());
      const data = (await res.json().catch(() => ({}))) as ApiComment & { error?: string };
      if (!res.ok) {
        showToast(data.error || 'Could not add comment.', 'error');
        return;
      }

      setCommentDraft('');
      setCommentsByTicket((current) => {
        const existing = current[selectedTicket.id] || [];
        return {
          ...current,
          [selectedTicket.id]: [data, ...existing],
        };
      });
      await Promise.all([
        refreshComments(selectedTicket.id, true),
        refreshActivity(selectedTicket.id, true),
      ]);
      showToast('Comment added.', 'success');
    } catch {
      showToast('Could not add comment.', 'error');
    } finally {
      setCommentSending(false);
    }
  }, [canComment, commentDraft, commentSending, refreshActivity, refreshComments, selectedTicket, showToast]);

  const handleRerouteSelected = useCallback(async () => {
    if (!selectedTicket || reroutingTicket || !canReroute) return;
    setReroutingTicket(true);
    try {
      const res = await ticketsApi.reroute(selectedTicket.id);
      const data = (await res.json().catch(() => ({}))) as { error?: string; assignedToName?: string };
      if (!res.ok) {
        showToast(data.error || 'Could not reroute this ticket.', 'error');
        return;
      }

      const refreshed = await ticketsApi.list();
      const body = await refreshed.json().catch(() => []);
      if (Array.isArray(body)) setTickets(body);
      await refreshActivity(selectedTicket.id, true);
      showToast(data.assignedToName ? `Rerouted to ${data.assignedToName}.` : 'Ticket rerouted.', 'success');
    } catch {
      showToast('Could not reroute this ticket.', 'error');
    } finally {
      setReroutingTicket(false);
    }
  }, [canReroute, refreshActivity, reroutingTicket, selectedTicket, showToast]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <DashboardLayout>
      <div className="th-page">
        <motion.div className="th-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="th-title">{pageTitle}</h1>
            <p className="th-subtitle">{pageSubtitle}</p>
          </div>
          <div className="th-header-actions">
            <button
              className="th-rail-toggle"
              onClick={() => setRightRailOpen((value) => !value)}
              aria-label={rightRailOpen ? 'Hide right side panel' : 'Show right side panel'}
              title={rightRailOpen ? 'Hide side panel' : 'Show side panel'}
            >
              {rightRailOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        </motion.div>

        <section className="th-filter-bar" aria-label="Ticket filters">
          <div className="th-rail-filters">
            {mode === 'queue' ? (
              <div className="th-tabs th-rail-tabs" role="tablist" aria-label="Ticket views">
                <button type="button" className="active" onClick={() => changeTab('active')} role="tab">
                  Working <span>{counts.active}</span>
                </button>
              </div>
            ) : (
              <div className="th-tabs th-rail-tabs" role="tablist" aria-label="Completed ticket views">
                <button type="button" className="active" role="tab">
                  Completed <span>{counts.done}</span>
                </button>
              </div>
            )}

            <div className="th-filter-stack">
              <label>
                <span>Priority</span>
                <select value={filterPriority} onChange={(event) => { setFilterPriority(event.target.value); resetPage(); }}>
                  <option value="all">All priorities</option>
                  <option value="P1">P1 critical</option>
                  <option value="P2">P2 high</option>
                  <option value="P3">P3 medium</option>
                  <option value="P4">P4 low</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={filterStatus} onChange={(event) => { setFilterStatus(event.target.value); resetPage(); }}>
                  {mode === 'history' ? (
                    <>
                      <option value="all">Completed statuses</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </>
                  ) : (
                    <>
                      <option value="all">All statuses</option>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In progress</option>
                      <option value="on_hold">On hold</option>
                      <option value="pending_routing">Pending routing</option>
                    </>
                  )}
                </select>
              </label>
              <label>
                <span>Category</span>
                <select value={filterCategory} onChange={(event) => { setFilterCategory(event.target.value); resetPage(); }}>
                  <option value="all">All categories</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            </div>

          </div>
        </section>

        <div className={`th-workbench ${rightRailOpen ? '' : 'right-rail-collapsed'}`}>
          <aside className="th-ticket-rail" aria-label="Tickets">
            <div className="th-queue-panel-head">
              <div>
                <span className="th-eyebrow">Tickets Queue</span>
                <strong>{sorted.length} visible</strong>
              </div>
              <span className="th-queue-panel-live"><span /> live</span>
            </div>

            <div className="th-search-wrap th-queue-search-wrap">
              <Search size={14} className="th-search-icon" />
              <input
                className="th-search"
                placeholder="Search working tickets"
                value={search}
                onChange={(event) => { setSearch(event.target.value); resetPage(); }}
              />
              {search && (
                <button className="th-search-clear" onClick={() => { setSearch(''); resetPage(); }} aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="th-list">
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => <div key={index} className="th-list-skeleton" />)
              ) : paginated.length === 0 ? (
                <div className="th-empty-rail">
                  <Circle size={22} />
                  <span>No tickets</span>
                </div>
              ) : (
                paginated.map((ticket) => (
                  <button
                    key={ticket.id}
                    className={`th-list-item ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                    onClick={() => navigate(ticketWorkspacePath(mode, ticket.id))}
                  >
                    <span className="th-list-top">
                      <span className="th-priority-pill" style={{ color: PRIORITY_COLOR[ticket.priority], background: `${PRIORITY_COLOR[ticket.priority]}14` }}>
                        {ticket.priority}
                      </span>
                      <span className="th-ticket-id">{ticketCode(ticket)}</span>
                      <span className="th-list-time">{timeAgo(ticket.created_at)}</span>
                    </span>
                    <span className="th-list-title">{ticket.title}</span>
                    <span className="th-list-meta-row">
                      <span className="th-list-status" style={{ background: `${STATUS_COLOR[ticket.status]}18`, color: STATUS_COLOR[ticket.status] }}>
                        {humanize(ticket.status)}
                      </span>
                      <span className="th-list-assignee">{assigneeLabel(ticket)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="th-rail-pagination">
                <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} aria-label="Previous page">
                  <ChevronLeft size={14} />
                </button>
                <div className="th-page-blocks" aria-label="Ticket pages">
                  {pageBlocks.map((block) => (
                    typeof block === 'number' ? (
                      <button
                        key={block}
                        className={page === block ? 'active' : ''}
                        onClick={() => setPage(block)}
                        aria-label={`Go to page ${block}`}
                        aria-current={page === block ? 'page' : undefined}
                      >
                        {block}
                      </button>
                    ) : (
                      <span key={block} className="th-page-ellipsis">…</span>
                    )
                  ))}
                </div>
                <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} aria-label="Next page">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </aside>

          <main className="th-ticket-main">
            {selectedTicket ? (
              <>
                <div className="th-detail-kicker">
                  <span className="th-priority-pill large" style={{ color: PRIORITY_COLOR[selectedTicket.priority], background: `${PRIORITY_COLOR[selectedTicket.priority]}14` }}>
                    {selectedTicket.priority}
                  </span>
                  <span className="th-ticket-id">{ticketCode(selectedTicket)}</span>
                  <span className="th-detail-status" style={{ background: `${STATUS_COLOR[selectedTicket.status]}22`, color: STATUS_COLOR[selectedTicket.status] }}>
                    {humanize(selectedTicket.status)}
                  </span>
                </div>

                <div className="th-detail-title-row">
                  <h2>{selectedTicket.title}</h2>
                  <button
                    type="button"
                    className="th-ticket-reroute"
                    onClick={handleRerouteSelected}
                    disabled={!canReroute || reroutingTicket}
                  >
                    <RotateCcw size={15} />
                    {reroutingTicket ? 'Rerouting' : 'Reroute'}
                  </button>
                </div>

                <p className="th-detail-description">{selectedTicket.description}</p>

                <div className="th-detail-panels">
                  <section className="th-section-card th-replication-card">
                    <header>
                      <span><FileText size={16} /> Replication Steps</span>
                      <small>technical evidence</small>
                    </header>
                    <pre>{selectedTicket.replication_steps || 'No replication steps were provided for this ticket.'}</pre>
                  </section>

                  <section className="th-section-card th-comments-card">
                    <header>
                      <span><MessageSquare size={16} /> Comments</span>
                      <small>{selectedComments.length} notes</small>
                    </header>

                    {canComment && (
                      <div className="th-comment-compose">
                        <span className="th-comment-avatar">
                          {user?.avatar_url ? <img src={apiAssetUrl(user.avatar_url)} alt="" /> : initials(`${user?.first_name || ''} ${user?.last_name || ''}`)}
                        </span>
                        <div className="th-comment-compose-body">
                          <textarea
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault();
                                void handleAddComment();
                              }
                            }}
                            placeholder="Add a comment"
                            rows={3}
                          />
                          <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={commentSending || !commentDraft.trim()}
                          >
                            <Send size={14} />
                            {commentSending ? 'Adding' : 'Comment'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="th-comment-thread">
                      {commentsLoading && !selectedComments.length ? (
                        <div className="th-comment-empty">Loading comments...</div>
                      ) : selectedComments.length ? (
                        selectedComments.map((comment) => (
                          <article className="th-comment-item" key={comment.id}>
                            <span className="th-comment-avatar">
                              {comment.avatar_url ? <img src={apiAssetUrl(comment.avatar_url)} alt="" /> : initials(commentAuthorName(comment))}
                            </span>
                            <div>
                              <div className="th-comment-meta">
                                <strong>{commentAuthorName(comment)}</strong>
                                <span>{timeAgo(comment.created_at)}</span>
                              </div>
                              <p>{comment.body}</p>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="th-comment-empty">No comments yet.</div>
                      )}
                    </div>
                  </section>

                </div>

              </>
            ) : (
              <div className="th-empty-main">
                <Circle size={32} />
                <h3>No ticket selected</h3>
                <p>Choose a ticket from the left column.</p>
              </div>
            )}
          </main>

          <aside className="th-side-rail" aria-label="Ticket logs">
            {rightRailOpen && (
              <div className="th-side-content">
                <section className="th-queue-routing-card th-side-properties-card" aria-label="Selected ticket properties">
                  <dl className="th-queue-routing-props">
                    <div>
                      <dt>Owner</dt>
                      <dd>{selectedTicket ? assigneeLabel(selectedTicket) : 'No ticket selected'}</dd>
                    </div>
                    <div>
                      <dt>Lane</dt>
                      <dd>{selectedTicket ? teamFor(selectedTicket) : 'Awaiting selection'}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd className="th-queue-property-control">
                        {selectedTicket ? (
                          canChangePriority ? (
                            <select
                              className="th-property-select"
                              value={selectedTicket.priority}
                              onChange={(event) => handlePriorityChange(event.target.value as ApiTicket['priority'])}
                              disabled={changingPriority}
                              aria-label="Change ticket priority"
                            >
                              <option value="P1">P1 Critical</option>
                              <option value="P2">P2 High</option>
                              <option value="P3">P3 Medium</option>
                              <option value="P4">P4 Low</option>
                            </select>
                          ) : (
                            priorityLabel(selectedTicket.priority)
                          )
                        ) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd className="th-queue-property-control">
                        {selectedTicket ? (
                          canChangeStatus ? (
                            <select
                              className="th-property-select th-property-select--status"
                              value={selectedTicket.status}
                              onChange={(event) => handleStatusChange(event.target.value as ApiTicket['status'])}
                              disabled={changingStatus}
                              aria-label="Change ticket status"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          ) : (
                            humanize(selectedTicket.status)
                          )
                        ) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{selectedTicket ? humanize(selectedTicket.type) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{selectedTicket?.category_name || '—'}</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{selectedTicket ? formatDate(selectedTicket.created_at) : '—'}</dd>
                    </div>
                  </dl>
                </section>

                <section className="th-side-log-card th-side-ai-decision-log" aria-label="AI decision log">
                  <header>
                    <span><BrainCircuit size={15} /> AI Decision Log</span>
                    <small>{humanize(routingPhase)}</small>
                  </header>
                  {selectedTicket ? (
                    <>
                      <div className="th-routing-intel">
                        <div className="th-confidence-ring" style={{ '--score': `${selectedConfidence}%` } as CSSProperties}>
                          <strong>{selectedConfidence}%</strong>
                          <span>confidence</span>
                        </div>
                        <div className="th-routing-copy">
                          <span className="th-route-badge">{recommendationFor(selectedTicket)}</span>
                          <p>{selectedRouting?.decision?.ticket_note?.summary || `Recommended lane: ${teamFor(selectedTicket)}`}</p>
                        </div>
                      </div>
                      <div className="th-ai-decision">
                        <span>AI decision</span>
                        <p>{aiDecisionReason(selectedTicket)}</p>
                      </div>
                    </>
                  ) : (
                    <p className="th-side-empty">Select a ticket to see routing context.</p>
                  )}
                </section>

                {selectedTicket && (
                  <div className="th-assignment-box th-assignment-box--pinned">
                    <span className="th-eyebrow">{ownerEyebrow} log</span>
                    <AssigneeCell ticket={selectedTicket} />
                    <small>{formatDate(selectedAssignmentTime)}</small>
                  </div>
                )}

                <section className="th-side-log-card th-side-activity-log" aria-label="Activity log">
                  <header>
                    <span><Activity size={15} /> Activity Log</span>
                    <small>{selectedTimeline.length} events</small>
                  </header>
                  {selectedTicket ? (
                    <>
                      {activityLoading && !selectedActivityEvents.length ? (
                        <div className="th-activity-loading" aria-label="Loading ticket activity">
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}
                      <div className="th-activity-list">
                        {selectedTimeline.map((event) => {
                          const Icon = event.icon;
                          return (
                            <div className={`th-activity-item tone-${event.tone}`} key={event.id}>
                              <span className="th-activity-icon"><Icon size={15} /></span>
                              <div>
                                <strong>{event.title}</strong>
                                <p>{event.detail}</p>
                              </div>
                              <time>{event.time}</time>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="th-side-empty">Select a ticket to see activity.</p>
                  )}
                </section>
              </div>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default TicketHistoryPage;
