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
import DeleteUserModal from '../components/DeleteUserModal';
import { ticketsApi, usersApi, notificationsApi, reportsApi, type AdminWorkload, type ApiTicket, type ApiUser, type ApiAiDecision, type HrDiagnostics, type SolvedByAssignee } from '../utils/apiClient';
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
import { canAccessApprovalQueue, getTicketListScope, isHrAdmin } from '../utils/orgRoles';
import './Dashboard.css';
import './SuperAdminDashboard.css';

const PRIORITY_COLOR: Record<string, string> = { P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280' };
const STATUS_PIE_COLORS = ['#ff6b6b', '#60a5fa', '#fbbf24', '#34c759', '#6b7280', '#d97706'];
const SOLVED_COLORS = ['#2563eb', '#8b5cf6', '#d97706', '#1f8a65', '#dc2626', '#0891b2', '#ca8a04'];
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

const RESOLUTION_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May'] as const;

/**
 * Average hours from created_at → closed_at per calendar month (Jan–May).
 * Replaces the old "Approval Wait Time" chart — shows how long issues take to resolve.
 */
function buildResolutionTimeByMonth(tickets: ApiTicket[]) {
  const buckets = new Map<string, { totalHours: number; count: number }>();
  RESOLUTION_MONTHS.forEach((m) => buckets.set(m, { totalHours: 0, count: 0 }));

  tickets.forEach((ticket) => {
    if (!ticket.closed_at || !['resolved', 'closed'].includes(ticket.status)) return;
    const created = new Date(ticket.created_at);
    const closed = new Date(ticket.closed_at);
    const month = created.toLocaleDateString('en-US', { month: 'short' });
    if (!buckets.has(month)) return;
    const hours = Math.max(0, (closed.getTime() - created.getTime()) / 3600000);
    const bucket = buckets.get(month)!;
    bucket.totalHours += hours;
    bucket.count += 1;
  });

  return RESOLUTION_MONTHS.map((month) => {
    const bucket = buckets.get(month)!;
    return {
      month,
      avgHours: bucket.count > 0 ? Math.round((bucket.totalHours / bucket.count) * 10) / 10 : 0,
      count: bucket.count,
      fill: '#2563eb',
    };
  });
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
  const showApprovals = canAccessApprovalQueue(user);
  const dashboardTabs: ('overview' | 'approvals' | 'users' | 'ai')[] = useMemo(
    () => (showApprovals ? ['overview', 'approvals', 'users', 'ai'] : ['overview', 'users', 'ai']),
    [showApprovals]
  );
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

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<HrDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);

  // Edit user profile
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

  // Delete user modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // HR Report generation
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'7d' | '30d'>('30d');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<{ html: string; markdown: string; filename: string } | null>(null);

  // Solved by assignee chart
  const [solvedByAssignee, setSolvedByAssignee] = useState<SolvedByAssignee[]>([]);
  const [solvedPeriod, setSolvedPeriod] = useState('30d');
  const [solvedLoading, setSolvedLoading] = useState(false);

  useEffect(() => {
    if (location.pathname === '/admin/users') setActiveTab('users');
    else if (location.pathname === '/admin/routing-logs') setActiveTab('ai');
    else if (location.pathname === '/admin/approvals' && showApprovals) setActiveTab('approvals');
    else setActiveTab('overview');
  }, [location.pathname, showApprovals]);

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

  useEffect(() => {
    if (!hrView && !user) return;
    let cancelled = false;
    setSolvedLoading(true);
    (async () => {
      try {
        const res = await ticketsApi.stats.solvedByAssignee(solvedPeriod);
        const body = await res.json();
        if (!cancelled) setSolvedByAssignee(Array.isArray(body) ? body : []);
      } finally {
        if (!cancelled) setSolvedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [solvedPeriod, user?.id, hrView]);

  const pendingUsers = users.filter((u) => u.status === 'pending');

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
  const resolutionByMonth = useMemo(() => buildResolutionTimeByMonth(tickets), [tickets]);
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

  const handleDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await reportsApi.hrDiagnostics();
      if (res.ok) {
        const body = await res.json();
        setDiagnostics(body);
        setShowDiagModal(true);
      }
    } finally {
      setDiagLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const res = await reportsApi.hrGenerate(reportPeriod);
      if (res.ok) {
        const body = await res.json();
        setReportData(body);
        showToast('Report generated successfully!', 'success');
      } else {
        showToast('Failed to generate report.', 'error');
      }
    } catch {
      showToast('Error generating report.', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = (format: 'html' | 'markdown') => {
    if (!reportData) return;
    const content = format === 'html' ? reportData.html : reportData.markdown;
    const ext = format === 'html' ? 'html' : 'md';
    const mimeType = format === 'html' ? 'text/html' : 'text/markdown';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startEditUser = (u: ApiUser) => {
    setEditingUser(u);
    setEditJobTitle(u.job_title || '');
    setEditDepartment(u.department || '');
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setEditJobTitle('');
    setEditDepartment('');
  };

  const saveEditUser = async () => {
    if (!editingUser) return;
    const res = await usersApi.updateProfile(editingUser.id, {
      jobTitle: editJobTitle || undefined,
      department: editDepartment || undefined,
    });
    if (res.ok) {
      const body = await res.json();
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, ...body.user } : u));
      showToast('Profile updated.', 'success');
      cancelEditUser();
    } else {
      showToast('Failed to update profile.', 'error');
    }
  };

  const handleDelete = (id: string, email: string) => {
    setDeleteTarget({ id, email });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await usersApi.delete(deleteTarget.id);
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        showToast(`${deleteTarget.email} removed.`, 'success');
        setDeleteTarget(null);
      } else {
        showToast('Failed to delete user.', 'error');
      }
    } catch {
      showToast('Error deleting user.', 'error');
    } finally {
      setDeleteLoading(false);
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
            {dashboardTabs.map((tab) => (
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
                    <div className="stat-card">
                      <h3>AI Diagnostics</h3>
                      <div className="stat-value" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                        <button
                          className="sa-btn approve"
                          onClick={handleDiagnostics}
                          disabled={diagLoading}
                          style={{ padding: '8px 16px', fontSize: '12px' }}
                        >
                          {diagLoading ? 'Running...' : 'Generate diagnostics'}
                        </button>
                      </div>
                    </div>
                    <div className="stat-card">
                      <h3>HR Report</h3>
                      <div className="stat-value" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                        <button
                          className="sa-btn approve"
                          onClick={() => setShowReportModal(true)}
                          style={{ padding: '8px 16px', fontSize: '12px', background: '#8b5cf6' }}
                        >
                          Generate report
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stat-card"><h3>Active Tickets</h3><div className="stat-value" style={{ color: '#60a5fa' }}>{ticketProgress.active}</div></div>
                    <div className="stat-card"><h3>In Progress</h3><div className="stat-value" style={{ color: '#fbbf24' }}>{ticketProgress.inProgress}</div></div>
                    <div className="stat-card"><h3>AI Routing Queue</h3><div className="stat-value">{ticketProgress.pendingRouting}</div></div>
                    <div className="stat-card"><h3>Team Members</h3><div className="stat-value">{users.filter((u) => u.role === 'user').length}</div></div>
                  </>
                )}
              </div>

              <div className="charts-grid" style={{ marginBottom: '48px' }}>
                <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                  <h4 className="chart-card-title">Amount of time to resolve issues</h4>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>
                    Average hours from open to closed (Jan–May), across Developers and QA assignees.
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={resolutionByMonth} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                      <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload as { avgHours: number; count: number };
                          return (
                            <div className="chart-tooltip">
                              <p>{label}</p>
                              <strong>{row.avgHours}h avg</strong>
                              <span style={{ display: 'block', fontSize: '11px' }}>{row.count} tickets closed</span>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="avgHours" name="Avg hours" radius={[4, 4, 0, 0]}>
                        {resolutionByMonth.map((row) => (
                          <Cell key={row.month} fill={row.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

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

                {hrView && (
                  <div className="chart-card">
                    <h4 className="chart-card-title">Most Tickets Solved</h4>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      {(['7d', '30d', '90d'] as const).map((p) => (
                        <button
                          key={p}
                          className={`sa-filter-chip ${solvedPeriod === p ? 'active' : ''}`}
                          onClick={() => setSolvedPeriod(p)}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    {solvedLoading ? (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Loading...</div>
                    ) : solvedByAssignee.length === 0 ? (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={solvedByAssignee} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                          <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Solved" radius={[0, 4, 4, 0]}>
                            {solvedByAssignee.map((_, i) => (
                              <Cell key={i} fill={SOLVED_COLORS[i % SOLVED_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
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
                            {showApprovals && u.status === 'pending' && (
                              <button className="sa-btn approve" onClick={() => handleApproval(u.id, 'active')}>Approve</button>
                            )}
                            {showApprovals && u.status === 'active' && (
                              <button className="sa-btn suspend" onClick={() => handleApproval(u.id, 'suspended')}>Suspend</button>
                            )}
                            {showApprovals && u.status === 'suspended' && (
                              <button className="sa-btn approve" onClick={() => handleApproval(u.id, 'active')}>Restore</button>
                            )}
                            {showApprovals && (
                              <button className="sa-btn" style={{ background: '#e5e7eb', color: '#374151', border: '1px solid #d1d5db' }} onClick={() => startEditUser(u)}>Edit</button>
                            )}
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

          {/* ─── Diagnostics Modal ──────────────────────────────── */}
          {showDiagModal && diagnostics && (
            <motion.div className="nt-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowDiagModal(false)}>
              <div className="nt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="nt-modal-header">
                  <h2>HR Diagnostics</h2>
                  <div className="nt-modal-header-right">
                    <span className="nt-shortcut-hint">{new Date(diagnostics.lastRunAt).toLocaleString()}</span>
                    <button className="nt-close-btn" onClick={() => setShowDiagModal(false)}>✕</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280' }}>
                      Resolved by Assignee
                    </h4>
                    <table className="ticket-table" style={{ fontSize: '12px' }}>
                      <thead><tr><th>Name</th><th>Dept</th><th>Resolved</th></tr></thead>
                      <tbody>
                        {diagnostics.resolvedByAssignee.map((r) => (
                          <tr key={r.name} className="ticket-table-row">
                            <td>{r.name}</td><td className="tbl-muted">{r.department || '—'}</td><td>{r.count}</td>
                          </tr>
                        ))}
                        {diagnostics.resolvedByAssignee.length === 0 && (
                          <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No resolved tickets</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="stat-card" style={{ padding: '16px' }}>
                      <h3>Avg Time to Resolve</h3>
                      <div className="stat-value" style={{ fontSize: '24px' }}>{diagnostics.avgTimeToResolveHours}h</div>
                    </div>
                    <div className="stat-card" style={{ padding: '16px' }}>
                      <h3>QA Queue Depth</h3>
                      <div className="stat-value" style={{ fontSize: '24px' }}>{diagnostics.qaQueueDepth}</div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280' }}>
                      Workload by Department
                    </h4>
                    <table className="ticket-table" style={{ fontSize: '12px' }}>
                      <thead><tr><th>Department</th><th>Open Tickets</th></tr></thead>
                      <tbody>
                        {diagnostics.workloadByDepartment.map((w) => (
                          <tr key={w.department} className="ticket-table-row">
                            <td>{w.department}</td><td>{w.open_tickets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Edit User Modal ──────────────────────────────── */}
          {editingUser && (
            <motion.div className="nt-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={cancelEditUser}>
              <div className="nt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <div className="nt-modal-header">
                  <h2>Edit Profile</h2>
                  <button className="nt-close-btn" onClick={cancelEditUser}>✕</button>
                </div>
                <div className="nt-form">
                  <div className="nt-field">
                    <label>Job Title</label>
                    <input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="e.g. Senior Developer" />
                  </div>
                  <div className="nt-field">
                    <label>Department</label>
                    <select value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}>
                      <option value="">No department</option>
                      <option value="Developers">Developers</option>
                      <option value="QA">QA</option>
                      <option value="Managers">Managers</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div className="nt-actions">
                    <Button variant="secondary" onClick={cancelEditUser}>Cancel</Button>
                    <Button variant="primary" onClick={saveEditUser}>Save</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Delete User Modal ──────────────────────────────── */}
          {deleteTarget && (
            <DeleteUserModal
              email={deleteTarget.email}
              onConfirm={confirmDelete}
              onCancel={() => setDeleteTarget(null)}
              isLoading={deleteLoading}
            />
          )}

          {/* ─── HR Report Modal ──────────────────────────────── */}
          {showReportModal && (
            <motion.div className="nt-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => !reportLoading && setShowReportModal(false)}>
              <div className="nt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="nt-modal-header">
                  <h2>Generate HR Report</h2>
                  <button className="nt-close-btn" onClick={() => setShowReportModal(false)}>✕</button>
                </div>

                {!reportData ? (
                  <div className="nt-form">
                    <div className="nt-field">
                      <label>Period</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setReportPeriod('7d')}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: reportPeriod === '7d' ? '#2563eb' : '#e5e7eb',
                            color: reportPeriod === '7d' ? 'white' : '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Weekly (7 days)
                        </button>
                        <button
                          onClick={() => setReportPeriod('30d')}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: reportPeriod === '30d' ? '#2563eb' : '#e5e7eb',
                            color: reportPeriod === '30d' ? 'white' : '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Monthly (30 days)
                        </button>
                      </div>
                    </div>
                    <div className="nt-actions">
                      <Button variant="secondary" onClick={() => setShowReportModal(false)}>Cancel</Button>
                      <Button variant="primary" onClick={handleGenerateReport} disabled={reportLoading}>
                        {reportLoading ? 'Generating…' : 'Generate Report'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '12px' }}>
                      <p style={{ margin: 0, color: '#166534', fontSize: '14px', fontWeight: '600' }}>✓ Report generated successfully!</p>
                    </div>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                      Download your report in your preferred format:
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => downloadReport('html')}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Download HTML
                      </button>
                      <button
                        onClick={() => downloadReport('markdown')}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          background: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Download Markdown
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowReportModal(false);
                        setReportData(null);
                      }}
                      style={{
                        padding: '8px 12px',
                        background: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                )}
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
                    const assigneeRole = d.assigned_to_job_title?.trim()
                      || routing?.decision?.assignee_job_title?.trim()
                      || '';
                    const assignedName = d.assigned_to_name || (routing?.assigned_admin_id ? 'assignment unavailable' : 'unassigned');
                    const assignedLabel = assigneeRole && assignedName !== 'unassigned' && assignedName !== 'assignment unavailable'
                      ? `${assignedName} · ${assigneeRole}`
                      : assignedName;
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
