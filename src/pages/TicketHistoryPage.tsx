import { useEffect, useMemo, useState, useCallback, useDeferredValue } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Circle,
  X,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  RotateCcw,
  BrainCircuit,
  FileText,
  Activity,
  UserCircle2,
  ClipboardList,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import UserProfileCard from '../components/UserProfileCard';
import CreateTicketModal from '../components/CreateTicketModal';
import { TicketListItem } from '../components/tickets/TicketListItem';
import { TicketDetailPanel } from '../components/tickets/TicketDetailPanel';
import { TicketSideRail } from '../components/tickets/TicketSideRail';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTicketCategories, useTicketList, invalidateTicketListCache } from '../hooks/useTicketData';
import { useToast } from '../context/useToast';
import { ticketsApi, type ApiTicket, type ApiActivityEvent, type ApiComment } from '../utils/apiClient';
import { formatTicketStatusLabel } from '../utils/ticketStatusLabel';
import {
  canMutateTicket,
  canRerouteTicket,
  canCommentOnTicket,
  canEditTicketDetails,
  getTicketListScope,
  getTicketQueueListScope,
  isOrgViewer,
  isTeamManager,
  isQaManager,
  showQueueOwnershipFilter,
  type QueueOwnershipFilter,
} from '../utils/orgRoles';
import './TicketHistoryPage.css';

const PAGE_SIZE = 12;
const QUEUE_STATUSES = new Set<ApiTicket['status']>(['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing']);
const COMPLETED_STATUSES = new Set<ApiTicket['status']>(['resolved', 'closed']);

type TicketHistoryMode = 'queue' | 'history';
type TicketTab = 'active' | 'all' | 'done';
type RoutingStep = { phase?: string; summary?: string };
type RoutingDecision = {
  confidence?: number;
  assignee_name?: string | null;
  assignee_job_title?: string | null;
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

/** Names and email tokens for person-based ticket search (developer, QA, submitter). */
function ticketPersonSearchText(ticket: ApiTicket): string {
  const routing = getRouting(ticket);
  const emailLocal = (email?: string | null) => {
    if (!email) return '';
    const local = email.split('@')[0] || '';
    return local.replace(/\./g, ' ');
  };
  return [
    ticket.assigned_to_name,
    ticket.qa_assignee_name,
    ticket.dev_assignee_name,
    ticket.assigned_to_job_title,
    ticket.qa_assignee_job_title,
    ticket.dev_assignee_job_title,
    routing?.decision?.assignee_name,
    routing?.decision?.assignee_job_title,
    emailLocal(ticket.submitted_by_email),
    ticket.submitted_by_email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
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

function priorityLabel(priority: ApiTicket['priority']): string {
  if (priority === 'P1') return 'Critical';
  if (priority === 'P2') return 'High';
  if (priority === 'P3') return 'Medium';
  return 'Low';
}

function activityActor(event: ApiActivityEvent): string {
  return `${event.first_name || ''} ${event.last_name || ''}`.trim() || event.actor_email || 'Deleted user';
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
  const assignedTo = cleanLabel(metadataText(metadata, 'assigned_to_name')) || assigneeLabel(ticket);
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
      detail: `${actor} moved status from ${formatTicketStatusLabel(oldStatus)} to ${formatTicketStatusLabel(newStatus)}.`,
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

function teamFor(ticket: ApiTicket): string {
  if (ticket.category_name) return ticket.category_name;
  if (ticket.type === 'incident') return 'Platform & Infrastructure';
  if (ticket.type === 'software') return 'Software Support';
  return 'Bug Reports';
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

  if (ticket.assigned_to_name || routing?.decision?.assignee_name) {
    events.push({
      id: `${ticket.id}-owner`,
      icon: UserCircle2,
      title: 'Owner assigned',
      detail: `${assigneeDisplay(ticket)} is the current operator for this ticket.`,
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
      title: formatTicketStatusLabel(ticket.status),
      detail: `Ticket is marked ${formatTicketStatusLabel(ticket.status)} and visible in completed history.`,
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

export function TicketHistoryPage({ mode = 'history' }: { mode?: TicketHistoryMode }) {
  const { user } = useCurrentUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id: routeTicketId } = useParams<{ id?: string }>();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TicketTab>(() => ticketTabForMode(mode));
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    setActiveTab(ticketTabForMode(mode));
    setFilterStatus('all');
    setPage(1);
  }
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
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editDescValue, setEditDescValue] = useState('');
  const [editReplicationValue, setEditReplicationValue] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [queueOwnership, setQueueOwnership] = useState<QueueOwnershipFilter>('team');
  const [profileCardUserId, setProfileCardUserId] = useState<string | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  const ticketListScope = useMemo(() => {
    if (mode === 'queue' && showQueueOwnershipFilter(user)) {
      return getTicketQueueListScope(user, queueOwnership);
    }
    return getTicketListScope(user);
  }, [mode, queueOwnership, user]);

  const { tickets, loading, revalidate: revalidateTickets, mutate: mutateTickets } = useTicketList(user ? ticketListScope : undefined);
  const { tickets: orgTickets } = useTicketList(mode === 'queue' && showQueueOwnershipFilter(user) ? { scope: 'org' } : undefined);
  const { tickets: assignedTickets } = useTicketList(mode === 'queue' && showQueueOwnershipFilter(user) ? { scope: 'assigned' } : undefined);
  const { categories } = useTicketCategories(Boolean(user));

  const refreshTicketList = useCallback(async () => {
    invalidateTicketListCache();
    await revalidateTickets();
  }, [revalidateTickets]);

  useEffect(() => {
    setSelectedTicketId(routeTicketId || '');
  }, [routeTicketId]);

  useEffect(() => {
    localStorage.setItem('lumina.ticketHistory.rightRailOpen', String(rightRailOpen));
  }, [rightRailOpen]);

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
    const q = deferredSearch.toLowerCase();
    return tabbedTickets.filter((ticket) => {
      if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
      if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && ticket.category_id !== filterCategory) return false;
      const code = ticketCode(ticket);
      const haystack = `${code} ${ticket.id} ${ticket.title} ${ticket.description} ${ticket.category_name} ${ticket.status} ${ticket.priority} ${assigneeDisplay(ticket)} ${ticketPersonSearchText(ticket)}`;
      if (q && !haystack.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tabbedTickets, filterStatus, filterPriority, filterCategory, deferredSearch]);

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
    if (loading) return; // don't clear selection before tickets have loaded
    if (!scopedTickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId('');
    }
  }, [scopedTickets, selectedTicketId, loading]);

  const selectedTicket = selectedTicketId
    ? scopedTickets.find((ticket) => ticket.id === selectedTicketId) || null
    : null;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageBlocks = useMemo(() => paginationBlocks(page, totalPages), [page, totalPages]);
  const selectedActivityEvents = selectedTicket ? activityByTicket[selectedTicket.id] || [] : [];
  const selectedTimeline = selectedTicket ? timelineEvents(selectedTicket, selectedActivityEvents) : [];
  const selectedComments = selectedTicket ? commentsByTicket[selectedTicket.id] || [] : [];
  const selectedAssignmentEvent = [...selectedActivityEvents]
    .reverse()
    .find((event) => event.action === 'ticket_assigned' || event.action === 'ticket_rerouted');
  const selectedAssignmentTime = selectedAssignmentEvent?.created_at || selectedTicket?.created_at || '';

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

  const tabCounts = useMemo(() => ({
    assigned: assignedTickets.filter((ticket) => QUEUE_STATUSES.has(ticket.status)).length,
    org: orgTickets.filter((ticket) => QUEUE_STATUSES.has(ticket.status)).length,
  }), [assignedTickets, orgTickets]);

  const pageTitle = mode === 'queue' ? 'Ticket Queue' : 'Ticket History';
  const adminQueueOwnership = showQueueOwnershipFilter(user);
  const pageSubtitle = mode === 'history'
    ? 'Completed ticket records with inline inspection'
    : user?.role === 'user'
      ? 'Your tickets in one compact workspace'
      : adminQueueOwnership && queueOwnership === 'assigned'
        ? 'Tickets currently assigned to you'
        : isOrgViewer(user)
          ? 'All organization tickets — view-only unless assigned to you'
          : 'All active ticket records with inline inspection';

  const changeTab = (tab: TicketTab) => {
    setActiveTab(tab);
    setPage(1);
  };
  const isRegularUser = user?.role === 'user';
  const isQaUser = user?.department === 'QA' || false;
  const isDevUser = !!(user?.department && user.department !== 'QA');
  const canManageReroutes = isTeamManager(user) || isQaManager(user);
  const canMutateSelected = Boolean(selectedTicket && canMutateTicket(user, selectedTicket));
  const canReroute = Boolean(selectedTicket && canRerouteTicket(user, selectedTicket));
  const canChangePriority = canMutateSelected;
  const canChangeStatus = canMutateSelected;
  const canComment = Boolean(selectedTicket && canCommentOnTicket(user, selectedTicket));
  const canEditDetails = Boolean(selectedTicket && canEditTicketDetails(user, selectedTicket));
  const canRouteToDeveloper = Boolean(selectedTicket && (canManageReroutes || (isQaUser && selectedTicket.qa_assignee_id === user?.id)));
  const canRerouteQa = Boolean(selectedTicket && (canManageReroutes || (isQaUser && selectedTicket.qa_assignee_id === user?.id)));
  const canRouteToQa = Boolean(selectedTicket && (canManageReroutes || (isDevUser && selectedTicket.dev_assignee_id === user?.id)));
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
      mutateTickets((current) => (current ?? []).map((ticket) => (
        ticket.id === selectedTicket.id ? { ...ticket, priority: nextPriority } : ticket
      )));
      await refreshTicketList();
      await refreshActivity(selectedTicket.id, true);
      showToast(`Priority changed to ${nextPriority}.`, 'success');
    } catch {
      showToast('Could not change ticket priority.', 'error');
    } finally {
      setChangingPriority(false);
    }
  }, [canChangePriority, changingPriority, mutateTickets, refreshActivity, refreshTicketList, selectedTicket, showToast]);

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
      mutateTickets((current) => (current ?? []).map((ticket) => (
        ticket.id === selectedTicket.id ? { ...ticket, status: nextStatus } : ticket
      )));
      await refreshTicketList();
      await refreshActivity(selectedTicket.id, true);
      showToast(`Status changed to ${formatTicketStatusLabel(nextStatus)}.`, 'success');
    } catch {
      showToast('Could not change ticket status.', 'error');
    } finally {
      setChangingStatus(false);
    }
  }, [canChangeStatus, changingStatus, mutateTickets, refreshActivity, refreshTicketList, selectedTicket, showToast]);

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

  /** Soft-delete: author removes own comment, or admin moderates with named tombstone. */
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!selectedTicket || commentDeletingId) return;
    setCommentDeletingId(commentId);
    try {
      const res = await ticketsApi.deleteComment(selectedTicket.id, commentId);
      const data = (await res.json().catch(() => ({}))) as ApiComment & { error?: string };
      if (!res.ok) {
        showToast(data.error || 'Could not delete comment.', 'error');
        return;
      }

      setCommentsByTicket((current) => {
        const list = current[selectedTicket.id] || [];
        return {
          ...current,
          [selectedTicket.id]: list.map((c) => (c.id === commentId ? { ...c, ...data } : c)),
        };
      });
      await Promise.all([
        refreshComments(selectedTicket.id, true),
        refreshActivity(selectedTicket.id, true),
      ]);
      showToast('Comment removed.', 'success');
    } catch {
      showToast('Could not delete comment.', 'error');
    } finally {
      setCommentDeletingId(null);
    }
  }, [commentDeletingId, refreshActivity, refreshComments, selectedTicket, showToast]);

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

      await refreshTicketList();
      await refreshActivity(selectedTicket.id, true);
      showToast(data.assignedToName ? `Rerouted to ${data.assignedToName}.` : 'Ticket rerouted.', 'success');
    } catch {
      showToast('Could not reroute this ticket.', 'error');
    } finally {
      setReroutingTicket(false);
    }
  }, [canReroute, refreshActivity, refreshTicketList, reroutingTicket, selectedTicket, showToast]);

  const handleQaVerify = useCallback(async () => {
    if (!selectedTicket) return;
    try {
      const res = await ticketsApi.qaVerify(selectedTicket.id);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showToast(data.error || 'Could not verify ticket.', 'error');
        return;
      }
      await refreshTicketList();
      await refreshActivity(selectedTicket.id, true);
      showToast('Ticket verified and resolved.', 'success');
    } catch {
      showToast('Could not verify ticket.', 'error');
    }
  }, [refreshActivity, refreshTicketList, selectedTicket, showToast]);

  const handleSaveDetails = useCallback(async () => {
    if (!selectedTicket || savingDetails) return;
    setSavingDetails(true);
    try {
      const body: Record<string, string> = {};
      if (editingTitle) body.title = editTitleValue;
      if (editingDesc) body.description = editDescValue;
      if (editingTitle || editingDesc) body.replicationSteps = editReplicationValue;
      if (!Object.keys(body).length) { setSavingDetails(false); return; }

      const res = await ticketsApi.updateDetails(selectedTicket.id, body);
      if (!res.ok) {
        showToast('Could not save changes.', 'error');
        return;
      }
      await refreshTicketList();
      setEditingTitle(false);
      setEditingDesc(false);
      showToast('Ticket details updated.', 'success');
    } catch {
      showToast('Could not save changes.', 'error');
    } finally {
      setSavingDetails(false);
    }
  }, [selectedTicket, savingDetails, editingTitle, editingDesc, editTitleValue, editDescValue, editReplicationValue, refreshTicketList, showToast]);

  const handleRouteToDeveloper = useCallback(async () => {
    if (!selectedTicket || reroutingTicket) return;
    setReroutingTicket(true);
    try {
      const res = await ticketsApi.routeToDeveloper(selectedTicket.id);
      const data = (await res.json().catch(() => ({}))) as { error?: string; assignedToName?: string };
      if (!res.ok) {
        showToast(data.error || 'Could not route to developer.', 'error');
        return;
      }
      await refreshTicketList();
      await refreshActivity(selectedTicket.id, true);
      showToast(data.assignedToName ? `Routed to ${data.assignedToName}.` : 'Routed to developer.', 'success');
    } catch {
      showToast('Could not route to developer.', 'error');
    } finally {
      setReroutingTicket(false);
    }
  }, [reroutingTicket, selectedTicket, refreshActivity, refreshTicketList, showToast]);

  const handleRerouteToAnotherQa = useCallback(async () => {
    if (!selectedTicket || reroutingTicket) return;
    setReroutingTicket(true);
    try {
      const res = await ticketsApi.rerouteToAnotherQa(selectedTicket.id);
      const data = (await res.json().catch(() => ({}))) as { error?: string; assignedToName?: string };
      if (!res.ok) {
        showToast(data.error || 'Could not reroute to another QA.', 'error');
        return;
      }
      await refreshTicketList();
      await refreshActivity(selectedTicket.id, true);
      showToast(data.assignedToName ? `Rerouted to ${data.assignedToName}.` : 'Rerouted to another QA.', 'success');
    } catch {
      showToast('Could not reroute to another QA.', 'error');
    } finally {
      setReroutingTicket(false);
    }
  }, [reroutingTicket, selectedTicket, refreshActivity, refreshTicketList, showToast]);

  const handleRouteToQa = useCallback(async () => {
    if (!selectedTicket || reroutingTicket) return;
    setReroutingTicket(true);
    try {
      const res = await ticketsApi.routeToQa(selectedTicket.id);
      const data = (await res.json().catch(() => ({}))) as { error?: string; assignedToName?: string };
      if (!res.ok) {
        showToast(data.error || 'Could not route to QA.', 'error');
        return;
      }
      await refreshTicketList();
      await refreshActivity(selectedTicket.id, true);
      showToast(data.assignedToName ? `Routed to ${data.assignedToName}.` : 'Routed to QA.', 'success');
    } catch {
      showToast('Could not route to QA.', 'error');
    } finally {
      setReroutingTicket(false);
    }
  }, [reroutingTicket, selectedTicket, refreshActivity, refreshTicketList, showToast]);

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
            <button className="th-create-ticket-btn" onClick={() => setShowNewTicket(true)}>
              <Plus size={15} />
              New Ticket
            </button>
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
                {adminQueueOwnership ? (
                  <>
                    <button
                      type="button"
                      className={queueOwnership === 'assigned' ? 'active' : ''}
                      onClick={() => { setQueueOwnership('assigned'); resetPage(); }}
                      role="tab"
                      aria-selected={queueOwnership === 'assigned'}
                    >
                      Assigned to me <span>{tabCounts.assigned}</span>
                    </button>
                    <button
                      type="button"
                      className={queueOwnership === 'team' ? 'active' : ''}
                      onClick={() => { setQueueOwnership('team'); resetPage(); }}
                      role="tab"
                      aria-selected={queueOwnership === 'team'}
                    >
                      {isOrgViewer(user) ? 'Organization' : 'All team'} <span>{tabCounts.org}</span>
                    </button>
                  </>
                ) : (
                  <button type="button" className="active" onClick={() => changeTab('active')} role="tab">
                    Working <span>{counts.active}</span>
                  </button>
                )}
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
                      <option value="resolved">{formatTicketStatusLabel('resolved')}</option>
                      <option value="closed">{formatTicketStatusLabel('closed')}</option>
                    </>
                  ) : (
                    <>
                      <option value="all">All statuses</option>
                      <option value="open">To Do</option>
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
            </div>

            <div className="th-search-wrap th-queue-search-wrap">
              <Search size={14} className="th-search-icon" />
              <input
                className="th-search"
                placeholder="Search tickets, people (e.g. Priya), dev or QA assignee…"
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
                  <TicketListItem
                    key={ticket.id}
                    ticket={ticket}
                    selected={selectedTicket?.id === ticket.id}
                    mode={mode}
                    onSelect={(id) => navigate(ticketWorkspacePath(mode, id))}
                  />
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
            <TicketDetailPanel
              ticket={selectedTicket}
              user={user}
              canReroute={canReroute}
              reroutingTicket={reroutingTicket}
              canEditDetails={canEditDetails}
              canComment={canComment}
              canMutate={canMutateSelected}
              isQaUser={isQaUser}
              isDevUser={isDevUser}
              canRouteToDeveloper={canRouteToDeveloper}
              canRerouteQa={canRerouteQa}
              canRouteToQa={canRouteToQa}
              editingTitle={editingTitle}
              editingDesc={editingDesc}
              editTitleValue={editTitleValue}
              editDescValue={editDescValue}
              savingDetails={savingDetails}
              comments={selectedComments}
              commentsLoading={commentsLoading}
              commentDraft={commentDraft}
              commentSending={commentSending}
              commentDeletingId={commentDeletingId}
              onReroute={() => { void handleRerouteSelected(); }}
              onRouteToDeveloper={() => { void handleRouteToDeveloper(); }}
              onRerouteToAnotherQa={() => { void handleRerouteToAnotherQa(); }}
              onRouteToQa={() => { void handleRouteToQa(); }}
              onQaVerify={() => { void handleQaVerify(); }}
              onCloseTicket={() => { void handleStatusChange('closed'); }}
              onEditTitleStart={() => {
                if (!selectedTicket) return;
                setEditingTitle(true);
                setEditTitleValue(selectedTicket.title);
              }}
              onEditDescStart={() => {
                if (!selectedTicket) return;
                setEditingDesc(true);
                setEditDescValue(selectedTicket.description);
                setEditReplicationValue(selectedTicket.replication_steps || '');
              }}
              onEditTitleChange={setEditTitleValue}
              onEditDescChange={setEditDescValue}
              onSaveDetails={() => { void handleSaveDetails(); }}
              onCancelEditDesc={() => setEditingDesc(false)}
              onDraftChange={setCommentDraft}
              onSubmitComment={() => { void handleAddComment(); }}
              onDeleteComment={(id) => { void handleDeleteComment(id); }}
              onAvatarClick={setProfileCardUserId}
            />
          </main>

          <TicketSideRail
            ticket={selectedTicket}
            canChangePriority={canChangePriority}
            canChangeStatus={canChangeStatus}
            changingPriority={changingPriority}
            changingStatus={changingStatus}
            onPriorityChange={handlePriorityChange}
            onStatusChange={handleStatusChange}
            ownerEyebrow={ownerEyebrow}
            rightRailOpen={rightRailOpen}
            timelineEvents={selectedTimeline}
            timelineLoading={activityLoading}
            assignmentTime={selectedAssignmentTime}
          />
        </div>
      </div>
      <CreateTicketModal
        open={showNewTicket}
        onClose={() => setShowNewTicket(false)}
        onCreated={(ticket) => {
          invalidateTicketListCache();
          if (ticketListScope.scope === 'assigned' && ticket.assigned_to_id !== user?.id) {
            void revalidateTickets();
          } else {
            mutateTickets((prev) => [ticket, ...(prev ?? [])]);
          }
          setShowNewTicket(false);
        }}
      />
      {profileCardUserId && (
        <UserProfileCard userId={profileCardUserId} onClose={() => setProfileCardUserId(null)} />
      )}
    </DashboardLayout>
  );
}

export default TicketHistoryPage;
