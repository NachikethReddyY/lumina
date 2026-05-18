import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { ExternalLink, Play, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ticketsApi, usersApi, type AdminWorkload, type ApiTicket } from '../utils/apiClient';
import './Dashboard.css';

const PRIORITY_COLOR: Record<string, string> = { P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280' };
const STATUS_COLOR: Record<string, string> = {
  open: '#ff6b6b', assigned: '#60a5fa', in_progress: '#fbbf24',
  resolved: '#34c759', closed: '#6b7280', on_hold: '#9ca3af', pending_routing: '#d97706',
};
const ACTIVE_TICKET_STATUSES = new Set<ApiTicket['status']>(['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing']);

function buildWeeklyLine(tickets: ApiTicket[]) {
  const days: Record<string, { resolved: number; created: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days[d.toLocaleDateString('en-US', { weekday: 'short' })] = { resolved: 0, created: 0 };
  }
  tickets.forEach((t) => {
    const label = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' });
    if (label in days) {
      days[label].created++;
      if (['resolved', 'closed'].includes(t.status)) days[label].resolved++;
    }
  });
  return Object.entries(days).map(([day, vals]) => ({ day, ...vals }));
}

function buildStatusMix(tickets: ApiTicket[]) {
  const labels: ApiTicket['status'][] = ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing', 'resolved', 'closed'];
  return labels
    .map((status) => ({
      name: status.replace(/_/g, ' '),
      value: tickets.filter((ticket) => ticket.status === status).length,
      color: STATUS_COLOR[status],
    }))
    .filter((item) => item.value > 0);
}

function buildAgeBuckets(tickets: ApiTicket[]) {
  const buckets = [
    { name: '0-1d', value: 0, fill: '#34c759' },
    { name: '2-3d', value: 0, fill: '#60a5fa' },
    { name: '4-7d', value: 0, fill: '#ff9500' },
    { name: '8d+', value: 0, fill: '#ff3b30' },
  ];

  tickets
    .filter((ticket) => ACTIVE_TICKET_STATUSES.has(ticket.status))
    .forEach((ticket) => {
      const ageDays = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / 86400000);
      if (ageDays <= 1) buckets[0].value++;
      else if (ageDays <= 3) buckets[1].value++;
      else if (ageDays <= 7) buckets[2].value++;
      else buckets[3].value++;
    });

  return buckets;
}

function buildPriorityWorkload(workload: AdminWorkload[]) {
  return workload.map((a) => ({
    name: a.first_name,
    P1: a.p1_count,
    P2: a.p2_count,
    P3: a.p3_count,
    P4: a.p4_count,
    score: a.load_score,
  }));
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: '8px', minWidth: '100px' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 4px' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || '#f7f8f8', fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const PAGE_SIZE = 8;

export function AdminDashboard() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [workload, setWorkload] = useState<AdminWorkload[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const scope = user?.role === 'admin' ? 'assigned' : undefined;
        const [ticketsRes, workloadRes] = await Promise.all([ticketsApi.list({ scope }), ticketsApi.workload()]);
        const [ticketsBody, workloadBody] = await Promise.all([ticketsRes.json(), workloadRes.json()]);
        if (cancelled) return;
        setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
        setWorkload(Array.isArray(workloadBody) ? workloadBody : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.role]);

  const filtered = useMemo(() =>
    tickets.filter((t) => {
      const s = filterStatus === 'all' || t.status === filterStatus;
      const p = filterPriority === 'all' || t.priority === filterPriority;
      return s && p;
    }),
    [tickets, filterStatus, filterPriority]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => ({
    p1: tickets.filter((t) => t.priority === 'P1').length,
    p2: tickets.filter((t) => t.priority === 'P2').length,
    active: tickets.filter((t) => ACTIVE_TICKET_STATUSES.has(t.status)).length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
  }), [tickets]);

  const myLoad = workload.find((e) => e.id === user?.id);
  const weeklyLine = useMemo(() => buildWeeklyLine(tickets), [tickets]);
  const statusMix = useMemo(() => buildStatusMix(tickets), [tickets]);
  const ageBuckets = useMemo(() => buildAgeBuckets(tickets), [tickets]);
  const priorityWorkload = useMemo(() => buildPriorityWorkload(workload), [workload]);
  const completionPct = tickets.length ? Math.round((counts.resolved / tickets.length) * 100) : 0;

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      alert('Email does not match. Please try again.');
      return;
    }

    if (!confirm(`Are you absolutely sure? This will permanently delete your account and cannot be undone.`)) {
      return;
    }

    try {
      const res = await usersApi.delete(user!.id);
      if (res.ok) {
        localStorage.removeItem('authToken');
        navigate('/login', { replace: true });
      } else {
        alert('Failed to delete account. Please try again.');
      }
    } catch {
      alert('Error deleting account. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Admin Dashboard</h1>
                <p className="dashboard-subtitle">Monitor load, resolve the queue, and reroute when needed.</p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card"><h3>Active Tickets</h3><div className="stat-value">{counts.active}</div></div>
            <div className="stat-card"><h3>In Progress</h3><div className="stat-value" style={{ color: '#fbbf24' }}>{counts.inProgress}</div></div>
            <div className="stat-card"><h3>Resolved</h3><div className="stat-value" style={{ color: '#34c759' }}>{counts.resolved}</div></div>
          </div>

          {/* Priority workload mini cards */}
          <div className="workload-grid" style={{ marginBottom: '32px' }}>
            {[
              { label: 'P1 Critical', val: counts.p1, color: '#ff3b30', pct: tickets.length ? (counts.p1 / tickets.length) * 100 : 0 },
              { label: 'P2 High', val: counts.p2, color: '#ff9500', pct: tickets.length ? (counts.p2 / tickets.length) * 100 : 0 },
              { label: 'Your Load Score', val: myLoad?.load_score ?? 0, color: '#3b82f6', pct: Math.min(100, ((myLoad?.load_score ?? 0) / 20) * 100) },
            ].map((item) => (
              <div key={item.label} className="workload-card">
                <h4>{item.label}</h4>
                <div className="workload-value">{item.val}</div>
                <div className="workload-bar">
                  <div className="workload-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <motion.div className="charts-grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="chart-card">
              <h4 className="chart-card-title">Throughput: Created vs Resolved</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyLine} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="created" name="Created" stroke="#60a5fa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#34c759" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4 className="chart-card-title">Your Task Progress</h4>
              <div className="progress-donut-shell">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2}>
                      {statusMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="progress-donut-label">
                  <strong>{completionPct}%</strong>
                  <span>complete</span>
                </div>
              </div>
              <div className="dashboard-chart-legend">
                {statusMix.map((entry) => (
                  <span key={entry.name}><i style={{ background: entry.color }} />{entry.name}</span>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h4 className="chart-card-title">Priority Load by Owner</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityWorkload} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="P1" stackId="priority" name="P1" fill="#ff3b30" />
                  <Bar dataKey="P2" stackId="priority" name="P2" fill="#ff9500" />
                  <Bar dataKey="P3" stackId="priority" name="P3" fill="#34c759" />
                  <Bar dataKey="P4" stackId="priority" name="P4" fill="#6b7280" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4 className="chart-card-title">Aging Risk</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageBuckets} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Active tickets" radius={[4, 4, 0, 0]}>
                    {ageBuckets.map((bucket) => <Cell key={bucket.name} fill={bucket.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Queue Table */}
          <section className="tickets-section">
            <div className="tickets-table-header">
              <h2>Active Queue</h2>
              <div className="tickets-filters">
                <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}>
                  <option value="all">All Priorities</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="pending_routing">Pending Routing</option>
                </select>
              </div>
            </div>

            {loading ? <p className="ticket-description">Loading queue…</p> : (
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((t) => (
                      <tr key={t.id} className="ticket-table-row">
                        <td>
                          <span className="tbl-priority" style={{ color: PRIORITY_COLOR[t.priority] }}>
                            <span className="tbl-priority-dot" style={{ background: PRIORITY_COLOR[t.priority] }} />
                            {t.priority}
                          </span>
                        </td>
                        <td
                          className="tbl-title"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/tickets/${t.id}`)}
                        >
                          {t.title} <ExternalLink size={11} style={{ opacity: 0.4, display: 'inline', verticalAlign: 'middle' }} />
                        </td>
                        <td>
                          <span className="tbl-status" style={{ color: STATUS_COLOR[t.status], background: `${STATUS_COLOR[t.status]}18` }}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="tbl-muted">{t.category_name}</td>
                        <td className="tbl-muted">{t.assigned_to_name || '—'}</td>
                        <td className="tbl-muted tbl-mono">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {(t.status === 'open' || t.status === 'assigned') && (
                              <Button variant="secondary" onClick={async () => {
                                const res = await ticketsApi.updateStatus(t.id, 'in_progress');
                                if (res.ok) setTickets((prev) => prev.map((item) => item.id === t.id ? { ...item, status: 'in_progress' } : item));
                              }}>
                                <Play size={11} />
                              </Button>
                            )}
                            {t.status === 'in_progress' && (
                              <Button variant="secondary" onClick={async () => {
                                const res = await ticketsApi.updateStatus(t.id, 'resolved');
                                if (res.ok) setTickets((prev) => prev.map((item) => item.id === t.id ? { ...item, status: 'resolved' } : item));
                              }}>
                                <CheckCircle2 size={11} />
                              </Button>
                            )}
                            <Button variant="secondary" onClick={async () => {
                              const res = await ticketsApi.reroute(t.id);
                              if (res.ok) {
                                const refreshed = await ticketsApi.list({ scope: user?.role === 'admin' ? 'assigned' : undefined });
                                const body = await refreshed.json().catch(() => []);
                                setTickets(Array.isArray(body) ? body : []);
                              }
                            }}>
                              <RotateCcw size={11} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginated.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No tickets</td></tr>
                    )}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="ticket-pagination">
                    <span className="pagination-info">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                    <div className="pagination-controls">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                        return <button key={p} onClick={() => setPage(p)} className={page === p ? 'active' : ''}>{p}</button>;
                      })}
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Delete Account Section */}
          <section className="admin-danger-zone">
            <div className="danger-zone-header">
              <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                Danger Zone
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '13px' }}>
                Permanent actions that cannot be undone
              </p>
            </div>

            {!showDeleteConfirm ? (
              <div style={{ padding: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)' }}>
                <p style={{ margin: '0 0 12px 0', color: '#d1d5db', fontSize: '13px' }}>
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '10px 16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={14} />
                  Delete My Account
                </button>
              </div>
            ) : (
              <div style={{ padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)' }}>
                <p style={{ margin: '0 0 12px 0', color: '#d1d5db', fontSize: '13px', fontWeight: '600' }}>
                  To confirm deletion, please type your email address:
                </p>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    background: 'rgba(31, 34, 40, 0.6)',
                    color: '#f7f8f8',
                    fontSize: '13px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmEmail('');
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmEmail !== user?.email}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: deleteConfirmEmail === user?.email ? '#ef4444' : 'rgba(239, 68, 68, 0.5)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: deleteConfirmEmail === user?.email ? 'pointer' : 'not-allowed',
                      opacity: deleteConfirmEmail === user?.email ? 1 : 0.5,
                    }}
                  >
                    Permanently Delete
                  </button>
                </div>
              </div>
            )}
          </section>
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
