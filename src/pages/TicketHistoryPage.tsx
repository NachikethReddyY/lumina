import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, ChevronRight,
  Circle, Sparkles, X, Send,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ticketsApi, categoriesApi, type ApiTicket, type ApiCategory } from '../utils/apiClient';
import './TicketHistoryPage.css';

const PRIORITY_COLOR: Record<string, string> = {
  P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280',
};
const STATUS_COLOR: Record<string, string> = {
  open: '#ff6b6b', assigned: '#60a5fa', in_progress: '#fbbf24',
  resolved: '#34c759', closed: '#6b7280', on_hold: '#9ca3af', pending_routing: '#d97706',
};

const PAGE_SIZE = 12;

// AI Ask panel
function AskAIPanel({ tickets }: { tickets: ApiTicket[] }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id || '');

  useEffect(() => {
    if (tickets.length && !selectedTicketId) setSelectedTicketId(tickets[0].id);
  }, [tickets, selectedTicketId]);

  const ask = async () => {
    if (!question.trim() || !selectedTicketId) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await ticketsApi.askAI(selectedTicketId, question.trim());
      const data = await res.json();
      setAnswer(data.answer || data.error || 'No response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="th-ai-panel">
      <div className="th-ai-header">
        <Sparkles size={16} className="th-ai-icon" />
        <span>Ask AI about a ticket</span>
      </div>
      <select
        className="th-ai-select"
        value={selectedTicketId}
        onChange={(e) => setSelectedTicketId(e.target.value)}
      >
        {tickets.map((t) => (
          <option key={t.id} value={t.id}>{t.title.slice(0, 50)}</option>
        ))}
      </select>
      <div className="th-ai-input-row">
        <input
          className="th-ai-input"
          placeholder="Ask anything about this ticket…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
        <button className="th-ai-send" onClick={ask} disabled={loading || !question.trim()}>
          <Send size={14} />
        </button>
      </div>
      {loading && <div className="th-ai-thinking"><span className="th-ai-dot" /><span className="th-ai-dot" /><span className="th-ai-dot" /></div>}
      {answer && (
        <div className="th-ai-answer">
          <div className="th-ai-answer-label">LUMINA AI</div>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export function TicketHistoryPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [showAI, setShowAI] = useState(false);

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && t.category_id !== filterCategory) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, filterStatus, filterPriority, filterCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = useCallback(() => setPage(1), []);

  const counts = useMemo(() => ({
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
  }), [tickets]);

  return (
    <DashboardLayout>
      <div className="th-page">
        <Container maxWidth="xl">
          {/* Header */}
          <motion.div className="th-header" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <h1 className="th-title">Ticket History</h1>
              <p className="th-subtitle">
                {user?.role === 'user' ? 'All your submitted support tickets' : 'All tickets across the system'}
              </p>
            </div>
            <div className="th-header-actions">
              <button
                className={`th-ai-toggle ${showAI ? 'active' : ''}`}
                onClick={() => setShowAI(!showAI)}
              >
                <Sparkles size={14} />
                Ask AI
              </button>
            </div>
          </motion.div>

          {/* AI Panel */}
          <AnimatePresence>
            {showAI && tickets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <AskAIPanel tickets={tickets} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats bar */}
          <div className="th-stats-bar">
            <div className="th-stat-pill">
              <span className="th-stat-dot" style={{ background: '#ff6b6b' }} />
              <span>{counts.open} Open</span>
            </div>
            <div className="th-stat-pill">
              <span className="th-stat-dot" style={{ background: '#fbbf24' }} />
              <span>{counts.inProgress} In Progress</span>
            </div>
            <div className="th-stat-pill">
              <span className="th-stat-dot" style={{ background: '#34c759' }} />
              <span>{counts.resolved} Resolved</span>
            </div>
            <div className="th-stat-pill">
              <span className="th-stat-dot" style={{ background: '#6b7280' }} />
              <span>{tickets.length} Total</span>
            </div>
          </div>

          {/* Filters bar */}
          <div className="th-filters">
            <div className="th-search-wrap">
              <Search size={14} className="th-search-icon" />
              <input
                className="th-search"
                placeholder="Search tickets…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              />
              {search && (
                <button className="th-search-clear" onClick={() => { setSearch(''); resetPage(); }}>
                  <X size={12} />
                </button>
              )}
            </div>

            <select className="th-filter-select" value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); resetPage(); }}>
              <option value="all">All Priorities</option>
              <option value="P1">P1 — Critical</option>
              <option value="P2">P2 — High</option>
              <option value="P3">P3 — Medium</option>
              <option value="P4">P4 — Low</option>
            </select>

            <select className="th-filter-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="pending_routing">Pending Routing</option>
            </select>

            <select className="th-filter-select" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); resetPage(); }}>
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Results count */}
          <div className="th-results-info">
            {filtered.length !== tickets.length
              ? `${filtered.length} of ${tickets.length} tickets`
              : `${tickets.length} tickets`}
          </div>

          {/* Content */}
          {loading ? (
            <div className="th-loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="th-skeleton" style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="th-empty">
              <Circle size={32} />
              <h3>No tickets found</h3>
              <p>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="ticket-table-wrap">
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Assignee</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t) => (
                    <tr key={t.id} className="ticket-table-row" onClick={() => navigate(`/tickets/${t.id}`)}>
                      <td>
                        <span className="tbl-priority" style={{ color: PRIORITY_COLOR[t.priority] }}>
                          <span className="tbl-priority-dot" style={{ background: PRIORITY_COLOR[t.priority] }} />
                          {t.priority}
                        </span>
                      </td>
                      <td className="tbl-title">{t.title}</td>
                      <td>
                        <span className="tbl-status" style={{ color: STATUS_COLOR[t.status], background: `${STATUS_COLOR[t.status]}18` }}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="tbl-muted">{t.category_name}</td>
                      <td className="tbl-muted">{t.assigned_to_name || '—'}</td>
                      <td className="tbl-muted tbl-mono">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="ticket-pagination">
              <span className="pagination-info">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="pagination-controls">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return <button key={p} onClick={() => setPage(p)} className={page === p ? 'active' : ''}>{p}</button>;
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default TicketHistoryPage;
