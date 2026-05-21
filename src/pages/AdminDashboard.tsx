import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ticketsApi, type AdminWorkload, type ApiTicket } from '../utils/apiClient';
import './Dashboard.css';

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

export function AdminDashboard() {
  const { user } = useCurrentUser();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [workload, setWorkload] = useState<AdminWorkload[]>([]);

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
      } catch {
        // Error fetching data
      }
    })();
    return () => { cancelled = true; };
  }, [user?.role]);


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

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Developer Dashboard</h1>
                <p className="dashboard-subtitle">Review reported issues, manage resolution queue, optimize workflow.</p>
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

        </Container>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
