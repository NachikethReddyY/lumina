import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Button from '../components/Button';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { SolvedByAssigneeChart } from '../components/charts/SolvedByAssigneeChart';
import { ticketsApi, usersApi, reportsApi, type AdminWorkload, type ApiTicket, type ApiUser, type SolvedByAssignee } from '../utils/apiClient';
import { useToast } from '../context/useToast';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getTicketListScope, isHrAdmin } from '../utils/orgRoles';
import {
  AdminPageHeader,
  AdminPageShell,
  ChartTooltip,
  PRIORITY_COLOR,
  USER_STATUS_COLORS,
  buildAdminPriorityLoad,
  buildHeadcountByDepartment,
  buildMonthlyLine,
  buildPeopleByDepartmentGroup,
  buildStatusPie,
  buildTicketProgressSummary,
  buildTicketsByDepartment,
} from './admin/dashboardShared';
import './Dashboard.css';
import './SuperAdminDashboard.css';

export function SuperAdminDashboard() {
  const { user } = useCurrentUser();
  const hrView = isHrAdmin(user);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [workload, setWorkload] = useState<AdminWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'7d' | '30d'>('30d');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<{ html: string; markdown: string; filename: string } | null>(null);

  const [solvedByAssignee, setSolvedByAssignee] = useState<SolvedByAssignee[]>([]);
  const [solvedPeriod, setSolvedPeriod] = useState('7d');
  const [solvedLoading, setSolvedLoading] = useState(false);

  const [personalTickets, setPersonalTickets] = useState<ApiTicket[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketsRes, usersRes, workloadRes, personalRes] = await Promise.all([
          ticketsApi.list(getTicketListScope(user)),
          usersApi.list(),
          ticketsApi.workload(),
          ticketsApi.list({ scope: 'assigned' }),
        ]);
        const [ticketsBody, usersBody, workloadBody, personalBody] = await Promise.all([
          ticketsRes.json(),
          usersRes.json(),
          workloadRes.json(),
          personalRes.json(),
        ]);
        if (cancelled) return;
        setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
        setUsers(Array.isArray(usersBody) ? usersBody : []);
        setWorkload(Array.isArray(workloadBody) ? workloadBody : []);
        setPersonalTickets(Array.isArray(personalBody) ? personalBody : []);
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
  const statusPie = useMemo(() => buildStatusPie(tickets), [tickets]);
  const monthlyLine = useMemo(() => buildMonthlyLine(tickets), [tickets]);
  const peopleByRole = useMemo(() => buildPeopleByDepartmentGroup(users), [users]);
  const adminPriorityLoad = useMemo(() => buildAdminPriorityLoad(workload), [workload]);
  const headcountByDept = useMemo(() => buildHeadcountByDepartment(users), [users]);
  const ticketsByDept = useMemo(() => buildTicketsByDepartment(tickets, users), [tickets, users]);
  const ticketProgress = useMemo(() => buildTicketProgressSummary(tickets), [tickets]);
  const personalProgress = useMemo(() => buildTicketProgressSummary(personalTickets), [personalTickets]);
  const priorityCounts = useMemo(() => ({
    p1: tickets.filter((t) => t.priority === 'P1').length,
    p2: tickets.filter((t) => t.priority === 'P2').length,
    p3: tickets.filter((t) => t.priority === 'P3').length,
    p4: tickets.filter((t) => t.priority === 'P4').length,
  }), [tickets]);
  const dataSnapshotLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    []
  );

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

  if (loading) {
    return <DashboardLayout><div className="dashboard-content" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <AdminPageShell>
        <Container maxWidth="xl">
          <AdminPageHeader
            title={hrView ? 'People Operations' : 'Admin Panel'}
            subtitle={
              hrView
                ? 'Organization-wide ticket progress, workload, and team health.'
                : 'System overview — tickets and team workload.'
            }
          />

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {hrView && (
              <p className="sa-data-snapshot" role="status">
                <span>Data as of <strong>{dataSnapshotLabel}</strong></span>
                <span><strong>{ticketProgress.active}</strong> active tickets</span>
                <span><strong>{ticketProgress.inProgress}</strong> in progress</span>
                <span><strong>{ticketProgress.resolved}</strong> abandoned / resolved</span>
                <span><strong>{users.length}</strong> people</span>
              </p>
            )}

            <div className="stats-grid">
              {hrView ? (
                <>
                  <div className="stat-card">
                    <h3>Active Tickets</h3>
                    <div className="stat-value" style={{ color: '#60a5fa' }}>{ticketProgress.active}</div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Your Active: {personalProgress.active}</p>
                  </div>
                  <div className="stat-card">
                    <h3>In Progress</h3>
                    <div className="stat-value" style={{ color: '#fbbf24' }}>{ticketProgress.inProgress}</div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Your In Progress: {personalProgress.inProgress}</p>
                  </div>
                  <div className="stat-card">
                    <h3>P3 Tickets</h3>
                    <div className="stat-value" style={{ color: '#34c759' }}>{priorityCounts.p3}</div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>P3s in the organization</p>
                  </div>
                  <div className="stat-card">
                    <h3>Abandoned</h3>
                    <div className="stat-value" style={{ color: '#16a34a' }}>{ticketProgress.resolved}</div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Your Abandoned: {personalProgress.resolved}</p>
                  </div>
                  <div className="stat-card"><h3>Pending Approval</h3><div className="stat-value" style={{ color: '#d97706' }}>{pendingUsers.length}</div></div>
                  <div className="stat-card"><h3>AI Routing Queue</h3><div className="stat-value">{ticketProgress.pendingRouting}</div></div>
                  <div className="stat-card"><h3>Total People</h3><div className="stat-value">{users.length}</div></div>
                  <div className="stat-card stat-card--span-row">
                    <h3>HR Report</h3>
                    <div className="stat-value" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                      <button
                        type="button"
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
              <div className="chart-card">
                <h4 className="chart-card-title">Ticket Volume (6 Months)</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyLine} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h4 className="chart-card-title">Status Distribution</h4>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280' }}>
                  Abandoned and resolved tickets highlighted in green
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {statusPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {statusPie.map((entry) => (
                    <span key={entry.name} className="pie-legend-item">
                      <span style={{ background: entry.fill }} className="pie-dot" />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <h4 className="chart-card-title">Priority Load by Admin</h4>
                <ResponsiveContainer width="100%" height={Math.max(240, adminPriorityLoad.length * 28 + 40)}>
                  <BarChart layout="vertical" data={adminPriorityLoad} margin={{ top: 4, right: 24, bottom: 0, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={168} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="P1" stackId="priority" name="P1" fill="#ff3b30" />
                    <Bar dataKey="P2" stackId="priority" name="P2" fill="#ff9500" />
                    <Bar dataKey="P3" stackId="priority" name="P3" fill="#34c759" />
                    <Bar dataKey="P4" stackId="priority" name="P4" fill="#6b7280" radius={[0, 4, 4, 0]} />
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
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                        {ticketsByDept.map((row) => <Cell key={row.name} fill={row.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {hrView && (
                <SolvedByAssigneeChart
                  data={solvedByAssignee.map((row) => ({ ...row, takeovers: row.takeovers ?? 0 }))}
                  period={solvedPeriod}
                  loading={solvedLoading}
                  onPeriodChange={setSolvedPeriod}
                />
              )}

              {hrView && headcountByDept.length > 0 && (
                <div className="chart-card">
                  <h4 className="chart-card-title">Headcount by Department</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={headcountByDept} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={({ name, value }) => `${name} (${value})`}>
                        {headcountByDept.map((row) => <Cell key={row.name} fill={row.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
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
                    <Tooltip content={<ChartTooltip />} />
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

          {showReportModal && (
            <motion.div className="nt-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => !reportLoading && setShowReportModal(false)}>
              <div className="nt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="nt-modal-header">
                  <h2>Generate HR Report</h2>
                  <button type="button" className="nt-close-btn" onClick={() => setShowReportModal(false)}>✕</button>
                </div>

                {!reportData ? (
                  <div className="nt-form">
                    <div className="nt-field">
                      <label>Report period</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => setReportPeriod('7d')} style={{ flex: 1, padding: '8px 12px', background: reportPeriod === '7d' ? '#2563eb' : '#e5e7eb', color: reportPeriod === '7d' ? 'white' : '#374151', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                          This week
                        </button>
                        <button type="button" onClick={() => setReportPeriod('30d')} style={{ flex: 1, padding: '8px 12px', background: reportPeriod === '30d' ? '#2563eb' : '#e5e7eb', color: reportPeriod === '30d' ? 'white' : '#374151', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                          This month
                        </button>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>
                        Monthly reports use the title format <strong>MAY 2026 REPORT</strong>. The HTML file includes search, filters, and pagination.
                      </p>
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
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Download your report in your preferred format:</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => downloadReport('html')} style={{ flex: 1, padding: '10px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        Download HTML
                      </button>
                      <button type="button" onClick={() => downloadReport('markdown')} style={{ flex: 1, padding: '10px 12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        Download Markdown
                      </button>
                    </div>
                    <button type="button" onClick={() => { setShowReportModal(false); setReportData(null); }} style={{ padding: '8px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </Container>
      </AdminPageShell>
    </DashboardLayout>
  );
}

export default SuperAdminDashboard;
