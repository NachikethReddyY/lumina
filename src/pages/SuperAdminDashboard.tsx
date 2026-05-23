import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Trash2, ChevronUp, ChevronDown, Search, Cpu } from 'lucide-react';
import Button from '../components/Button';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { ticketsApi, usersApi, notificationsApi, type AdminWorkload, type ApiTicket, type ApiUser, type ApiAiDecision } from '../utils/apiClient';
import { apiAssetUrl } from '../utils/apiBase';
import {
  DEPARTMENT_GROUP_FILTERS,
  formatUserEmailAndRole,
  getDepartmentGroupLabel,
  getUserDepartmentGroup,
  getUserRoleLabel,
  matchesDepartmentGroupFilter,
  type DepartmentGroupFilter,
} from '../utils/userDisplay';
import { useToast } from '../context/useToast';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getTicketListScope, isHrAdmin } from '../utils/orgRoles';
import './Dashboard.css';
import './SuperAdminDashboard.css';

const PRIORITY_COLOR: Record<string, string> = { P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280' };
const STATUS_PIE_COLORS = ['#ff6b6b', '#60a5fa', '#fbbf24', '#34c759', '#6b7280', '#d97706'];
const USER_STATUS_COLORS: Record<ApiUser['status'], string> = {
  active: '#2563eb',
  pending: '#d97706',
  suspended: '#dc2626',
};

function buildStatusPie(tickets: ApiTicket[]) {
  const map: Record<string, number> = {};
  tickets.forEach((t) => { map[t.status] = (map[t.status] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
}

function buildMonthlyLine(tickets: ApiTicket[]) {
  const months: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
  }
  tickets.forEach((t) => {
    const label = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short' });
    if (label in months) months[label]++;
  });
  return Object.entries(months).map(([month, count]) => ({ month, count }));
}

function buildPeopleByDepartmentGroup(users: ApiUser[]) {
  const groups = ['manager', 'developer', 'user'] as const;
  return groups.map((group) => {
    const scoped = users.filter((user) => getUserDepartmentGroup(user) === group);
    return {
      role: getDepartmentGroupLabel(group),
      active: scoped.filter((user) => user.status === 'active').length,
      pending: scoped.filter((user) => user.status === 'pending').length,
      suspended: scoped.filter((user) => user.status === 'suspended').length,
    };
  });
}

const DEPT_CHART_COLORS: Record<string, string> = {
  Developers: '#2563eb',
  QA: '#8b5cf6',
  Managers: '#d97706',
  HR: '#1f8a65',
  Unknown: '#6b7280',
};

function buildHeadcountByDepartment(users: ApiUser[]) {
  const counts: Record<string, number> = {};
  users.forEach((user) => {
    const dept = user.department?.trim() || 'Unknown';
    counts[dept] = (counts[dept] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    fill: DEPT_CHART_COLORS[name] || DEPT_CHART_COLORS.Unknown,
  }));
}

function buildTicketsByDepartment(tickets: ApiTicket[], users: ApiUser[]) {
  const byEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const counts: Record<string, number> = {};
  tickets.forEach((ticket) => {
    const submitter = byEmail.get((ticket.submitted_by_email || '').toLowerCase());
    const dept = submitter?.department?.trim() || 'Unknown';
    counts[dept] = (counts[dept] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    fill: DEPT_CHART_COLORS[name] || DEPT_CHART_COLORS.Unknown,
  }));
}

function buildTicketProgressSummary(tickets: ApiTicket[]) {
  const active = tickets.filter((t) =>
    ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)
  ).length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const resolved = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const pendingRouting = tickets.filter((t) => t.status === 'pending_routing').length;
  return { active, inProgress, resolved, pendingRouting, total: tickets.length };
}

function buildPendingAgeBuckets(users: ApiUser[]) {
  const buckets = [
    { name: '0-1d', value: 0, fill: '#2563eb' },
    { name: '2-3d', value: 0, fill: '#60a5fa' },
    { name: '4-7d', value: 0, fill: '#d97706' },
    { name: '8d+', value: 0, fill: '#dc2626' },
  ];

  users
    .filter((user) => user.status === 'pending')
    .forEach((user) => {
      const ageDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
      if (ageDays <= 1) buckets[0].value++;
      else if (ageDays <= 3) buckets[1].value++;
      else if (ageDays <= 7) buckets[2].value++;
      else buckets[3].value++;
    });

  return buckets;
}

function buildAdminPriorityLoad(workload: AdminWorkload[]) {
  return workload.map((admin) => ({
    name: admin.first_name,
    P1: admin.p1_count,
    P2: admin.p2_count,
    P3: admin.p3_count,
    P4: admin.p4_count,
    score: admin.load_score,
  }));
}

function luminaVoice(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/Gemini AI/gi, 'Lumina AI')
    .replace(/Gemini fallback was used because:\s*/gi, 'Lumina AI used fallback routing because ')
    .replace(/Gemini routing request failed \(429\)/gi, 'the routing model was rate limited (429)')
    .replace(/Gemini routing request failed \((\d+)\)/gi, 'the routing model request failed ($1)')
    .replace(/\bGemini\b/gi, 'Lumina AI');
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p>{label}</p>
      {payload.map((p) => (
        <strong key={p.name} style={{ color: p.color || undefined }}>{p.name}: {p.value}</strong>
      ))}
    </div>
  );
};

type StatusFilter = 'all' | 'active' | 'pending' | 'suspended';

export function SuperAdminDashboard() {
  const location = useLocation();
  const { user } = useCurrentUser();
  const hrView = isHrAdmin(user);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [workload, setWorkload] = useState<AdminWorkload[]>([]);
  const [aiDecisions, setAiDecisions] = useState<ApiAiDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users' | 'ai'>('overview');

  // User management
  const [departmentGroupFilter, setDepartmentGroupFilter] = useState<DepartmentGroupFilter>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<StatusFilter>('all');
  const [userSearch, setUserSearch] = useState('');
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);

  useEffect(() => {
    if (location.pathname === '/admin/users') setActiveTab('users');
    else if (location.pathname === '/admin/routing-logs') setActiveTab('ai');
    else if (location.pathname === '/admin/approvals') setActiveTab('approvals');
    else setActiveTab('overview');
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketsRes, usersRes, workloadRes, aiRes] = await Promise.all([
          ticketsApi.list(getTicketListScope(user)),
          usersApi.list(),
          ticketsApi.workload(),
          notificationsApi.aiDecisions(),
        ]);
        const [ticketsBody, usersBody, workloadBody, aiBody] = await Promise.all([
          ticketsRes.json(),
          usersRes.json(),
          workloadRes.json(),
          aiRes.json(),
        ]);
        if (cancelled) return;
        setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
        setUsers(Array.isArray(usersBody) ? usersBody : []);
        setWorkload(Array.isArray(workloadBody) ? workloadBody : []);
        setAiDecisions(Array.isArray(aiBody) ? aiBody : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.department]);

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeAdmins = users.filter((u) => u.role !== 'user' && u.status === 'active');

  const filteredUsers = useMemo(() => {
    const statusWeight: Record<ApiUser['status'], number> = { pending: 0, active: 1, suspended: 2 };
    return users
      .filter((u) => {
        const roleOk = matchesDepartmentGroupFilter(u, departmentGroupFilter);
        const statusOk = userStatusFilter === 'all' || u.status === userStatusFilter;
        const searchOk = !userSearch || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase());
        return roleOk && statusOk && searchOk;
      })
      .sort((a, b) => statusWeight[a.status] - statusWeight[b.status] || `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  }, [users, departmentGroupFilter, userStatusFilter, userSearch]);

  const statusPie = useMemo(() => buildStatusPie(tickets), [tickets]);
  const monthlyLine = useMemo(() => buildMonthlyLine(tickets), [tickets]);
  const peopleByRole = useMemo(() => buildPeopleByDepartmentGroup(users), [users]);
  const pendingAgeBuckets = useMemo(() => buildPendingAgeBuckets(users), [users]);
  const adminPriorityLoad = useMemo(() => buildAdminPriorityLoad(workload), [workload]);
  const headcountByDept = useMemo(() => buildHeadcountByDepartment(users), [users]);
  const ticketsByDept = useMemo(() => buildTicketsByDepartment(tickets, users), [tickets, users]);
  const ticketProgress = useMemo(() => buildTicketProgressSummary(tickets), [tickets]);

  const handleApproval = async (id: string, status: 'active' | 'suspended') => {
    const res = await usersApi.updateApproval(id, status);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
      showToast(status === 'active' ? 'User approved.' : 'User suspended.', 'success');
    }
  };

  const handleRoleChange = async (id: string, role: 'user' | 'admin') => {
    const res = await usersApi.updateRole(id, role);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
      showToast('Role updated.', 'info');
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    const res = await usersApi.delete(id);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast(`${email} removed.`, 'success');
    }
  };

  if (loading) {
    return <DashboardLayout><div className="dashboard-content" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="dashboard-content super-admin-content">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">{hrView ? 'People Operations' : 'Admin Panel'}</h1>
                <p className="dashboard-subtitle">
                  {hrView
                    ? 'Organization-wide progress, approvals, AI routing transparency, and user directory.'
                    : 'System management — users, routing, and AI transparency.'}
                </p>
              </div>
            </div>
          </motion.div>


          {/* Tab nav */}
          <div className="sa-tabs">
            {(['overview', 'approvals', 'users', 'ai'] as const).map((tab) => (
              <button
                key={tab}
                className={`sa-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'overview' ? 'Overview' : tab === 'approvals' ? `Approval Queue${pendingUsers.length ? ` (${pendingUsers.length})` : ''}` : tab === 'users' ? `Users (${users.length})` : 'AI Decisions'}
              </button>
            ))}
          </div>

          {/* ─── OVERVIEW TAB ─────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="stats-grid">
                {hrView ? (
                  <>
                    <div className="stat-card"><h3>Active Tickets</h3><div className="stat-value" style={{ color: '#60a5fa' }}>{ticketProgress.active}</div></div>
                    <div className="stat-card"><h3>In Progress</h3><div className="stat-value" style={{ color: '#fbbf24' }}>{ticketProgress.inProgress}</div></div>
                    <div className="stat-card"><h3>Resolved / Closed</h3><div className="stat-value" style={{ color: '#34c759' }}>{ticketProgress.resolved}</div></div>
                    <div className="stat-card"><h3>Pending Approval</h3><div className="stat-value" style={{ color: '#d97706' }}>{pendingUsers.length}</div></div>
                    <div className="stat-card"><h3>AI Routing Queue</h3><div className="stat-value">{ticketProgress.pendingRouting}</div></div>
                    <div className="stat-card"><h3>Total People</h3><div className="stat-value">{users.length}</div></div>
                  </>
                ) : (
                  <>
                    <div className="stat-card"><h3>Pending Approval</h3><div className="stat-value" style={{ color: '#fbbf24' }}>{pendingUsers.length}</div></div>
                    <div className="stat-card"><h3>Active Staff</h3><div className="stat-value" style={{ color: '#60a5fa' }}>{activeAdmins.length}</div></div>
                    <div className="stat-card"><h3>Total Users</h3><div className="stat-value">{users.length}</div></div>
                  </>
                )}
              </div>

              <div className="charts-grid" style={{ marginBottom: '48px' }}>
                <div className="chart-card">
                  <h4 className="chart-card-title">Ticket Volume (6 Months)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyLine} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                      <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h4 className="chart-card-title">Status Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusPie.map((_, i) => (
                          <Cell key={i} fill={STATUS_PIE_COLORS[i % STATUS_PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {statusPie.map((entry, i) => (
                      <span key={entry.name} className="pie-legend-item">
                        <span style={{ background: STATUS_PIE_COLORS[i % STATUS_PIE_COLORS.length] }} className="pie-dot" />
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <h4 className="chart-card-title">Priority Load by Admin</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={adminPriorityLoad} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="P1" stackId="priority" name="P1" fill="#ff3b30" />
                      <Bar dataKey="P2" stackId="priority" name="P2" fill="#ff9500" />
                      <Bar dataKey="P3" stackId="priority" name="P3" fill="#34c759" />
                      <Bar dataKey="P4" stackId="priority" name="P4" fill="#6b7280" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="dashboard-chart-legend">
                    {Object.entries(PRIORITY_COLOR).map(([priority, color]) => (
                      <span key={priority}><i style={{ background: color }} />{priority}</span>
                    ))}
                  </div>
                </div>

                {hrView && ticketsByDept.length > 0 && (
                  <div className="chart-card">
                    <h4 className="chart-card-title">Tickets by Department</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={ticketsByDept} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                          {ticketsByDept.map((row) => <Cell key={row.name} fill={row.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {hrView && headcountByDept.length > 0 && (
                  <div className="chart-card">
                    <h4 className="chart-card-title">Headcount by Department</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={headcountByDept} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={({ name, value }) => `${name} (${value})`}>
                          {headcountByDept.map((row) => <Cell key={row.name} fill={row.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="chart-card">
                  <h4 className="chart-card-title">{hrView ? 'People by Team & Status' : 'People by Role & Status'}</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={peopleByRole} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                      <XAxis dataKey="role" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="active" stackId="status" name="Active" fill={USER_STATUS_COLORS.active} />
                      <Bar dataKey="pending" stackId="status" name="Pending" fill={USER_STATUS_COLORS.pending} />
                      <Bar dataKey="suspended" stackId="status" name="Suspended" fill={USER_STATUS_COLORS.suspended} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="dashboard-chart-legend">
                    {Object.entries(USER_STATUS_COLORS).map(([status, color]) => (
                      <span key={status}><i style={{ background: color }} />{status}</span>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <h4 className="chart-card-title">Approval Wait Time</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={pendingAgeBuckets} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Pending users" radius={[4, 4, 0, 0]}>
                        {pendingAgeBuckets.map((bucket) => <Cell key={bucket.name} fill={bucket.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </motion.div>
          )}

          {/* ─── APPROVALS TAB ─────────────────────────────────────── */}
          {activeTab === 'approvals' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <section className="tickets-section">
                <h2>Approval Queue</h2>
                {pendingUsers.length > 0 ? (
                  <div className="queue-list-container">
                    {pendingUsers.map((account) => (
                      <div key={account.id} className="queue-item">
                        <div className="queue-item-info">
                          <div className="sa-user-avatar queue-avatar">
                            {account.avatar_url
                              ? <img src={apiAssetUrl(account.avatar_url)} alt="" />
                              : `${account.first_name[0]}${account.last_name[0]}`}
                          </div>
                          <div className="queue-item-text">
                            <p className="queue-item-title">{account.first_name} {account.last_name}</p>
                            <p className="queue-item-meta">{formatUserEmailAndRole(account)}</p>
                          </div>
                        </div>
                        <div className="queue-item-actions">
                          <Button variant="primary" onClick={() => handleApproval(account.id, 'active')}>Approve</Button>
                          <Button variant="secondary" onClick={() => handleApproval(account.id, 'suspended')}>Suspend</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><h3>No pending approvals</h3><p>New account requests will appear here.</p></div>
                )}
              </section>
            </motion.div>
          )}

          {/* ─── USERS TAB ─────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="sa-user-filters">
                <div className="sa-search-wrap">
                  <Search size={14} className="sa-search-icon" />
                  <input
                    className="sa-search-input"
                    placeholder="Search name or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="sa-filter-group">
                  {DEPARTMENT_GROUP_FILTERS.map((group) => (
                    <button
                      key={group}
                      className={`sa-filter-chip ${departmentGroupFilter === group ? 'active' : ''}`}
                      onClick={() => setDepartmentGroupFilter(group)}
                    >
                      {getDepartmentGroupLabel(group)}
                    </button>
                  ))}
                </div>
                <div className="sa-filter-group">
                  {(['all', 'active', 'pending', 'suspended'] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      className={`sa-filter-chip ${userStatusFilter === s ? 'active' : ''}`}
                      onClick={() => setUserStatusFilter(s)}
                    >
                      {s === 'all' ? 'All Status' : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ticket-table-wrap">
                <table className="ticket-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Job role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="ticket-table-row">
                        <td>
                          <div className="sa-user-cell">
                            <div className="sa-user-avatar">
                              {u.avatar_url
                                ? <img src={apiAssetUrl(u.avatar_url)} alt="" />
                                : `${u.first_name[0]}${u.last_name[0]}`
                              }
                            </div>
                            {u.first_name} {u.last_name}
                          </div>
                        </td>
                        <td className="tbl-muted" style={{ fontSize: '12px' }}>{u.email}</td>
                        <td className="tbl-muted" style={{ fontSize: '12px' }}>
                          {getUserRoleLabel(u) || '—'}
                        </td>
                        <td>
                          <span className={`sa-status-badge ${u.status}`}>{u.status}</span>
                        </td>
                        <td className="tbl-muted tbl-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="sa-action-row">
                            {u.status === 'pending' && (
                              <button className="sa-btn approve" onClick={() => handleApproval(u.id, 'active')}>Approve</button>
                            )}
                            {u.status === 'active' && (
                              <button className="sa-btn suspend" onClick={() => handleApproval(u.id, 'suspended')}>Suspend</button>
                            )}
                            {u.status === 'suspended' && (
                              <button className="sa-btn approve" onClick={() => handleApproval(u.id, 'active')}>Restore</button>
                            )}
                            <select
                              className="sa-role-select"
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as ApiUser['role'])}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button className="sa-btn delete" onClick={() => handleDelete(u.id, u.email)} title="Delete user">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No users match</td></tr>
                    )}
                  </tbody>
                </table>
                {/* Space/padding/footer below users table */}
                <div className="sa-users-table-footer" style={{ minHeight: '64px' }} />
              </div>
            </motion.div>
          )}

          {/* ─── AI DECISIONS TAB ──────────────────────────────────── */}
          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="ai-panel-header">
                <Cpu size={18} className="ai-panel-icon" />
                <div>
                  <h2 className="ai-panel-title">AI Routing Decisions</h2>
                  <p className="ai-panel-sub">Every ticket routing decision made by Lumina AI or the rule engine — transparent and traceable.</p>
                </div>
              </div>

              {aiDecisions.length === 0 ? (
                <div className="empty-state"><h3>No routing decisions yet</h3><p>Decisions appear here as tickets are created and routed.</p></div>
              ) : (
                <div className="ai-decisions-list">
                  {aiDecisions.map((d) => {
                    const routing = d.routing;
                    const isLuminaAi = routing?.source === 'gemini' || routing?.source === 'lumina_ai';
                    const isFallback = routing?.source === 'rules_fallback';
                    const isExpanded = expandedDecision === d.id;
                    const assignedLabel = d.assigned_to_name || (routing?.assigned_admin_id ? 'assignment unavailable' : 'unassigned');
                    return (
                      <div key={d.id} className={`ai-decision-card ${isLuminaAi ? 'lumina' : isFallback ? 'fallback' : 'rules'}`}>
                        <div className="ai-decision-top" onClick={() => setExpandedDecision(isExpanded ? null : d.id)}>
                          <div className="ai-decision-left">
                            <span className={`ai-source-badge ${isLuminaAi ? 'lumina' : isFallback ? 'fallback' : 'rules'}`}>
                              {isLuminaAi ? '✦ LUMINA AI' : isFallback ? '↺ FALLBACK' : '⚡ RULES'}
                            </span>
                            <span className="ai-ticket-priority" style={{ color: PRIORITY_COLOR[d.priority] }}>
                              {d.priority}
                            </span>
                            <span className="ai-ticket-title">{d.title}</span>
                          </div>
                          <div className="ai-decision-right">
                            <span className="ai-assigned-to">→ {assignedLabel}</span>
                            <span className="ai-decision-date">{new Date(d.created_at).toLocaleDateString()}</span>
                            {isExpanded ? <ChevronUp size={14} className="ai-chevron" /> : <ChevronDown size={14} className="ai-chevron" />}
                          </div>
                        </div>

                        {isExpanded && routing?.reasoning && (
                          <div className="ai-decision-reasoning">
                            <div className="ai-reasoning-label">REASONING</div>
                            <pre className="ai-reasoning-text">{luminaVoice(routing.reasoning)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default SuperAdminDashboard;
