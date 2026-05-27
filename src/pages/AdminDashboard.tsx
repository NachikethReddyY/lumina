import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend, Label,
} from 'recharts';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getTicketListScope } from '../utils/orgRoles';
import { useSolvedByAssignee, useTicketList, useTicketThroughput } from '../hooks/useTicketData';
import { SolvedByAssigneeChart } from '../components/charts/SolvedByAssigneeChart';
import { type ApiTicket } from '../utils/apiClient';
import { formatStatusLabel } from './admin/dashboardShared';
import './Dashboard.css';

const STATUS_COLOR: Record<string, string> = {
  open: '#ff6b6b', assigned: '#60a5fa', in_progress: '#fbbf24',
  resolved: '#34c759', closed: '#6b7280', on_hold: '#9ca3af', pending_routing: '#d97706',
};
const ACTIVE_TICKET_STATUSES = new Set<ApiTicket['status']>(['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing']);

function buildStatusMix(tickets: ApiTicket[]) {
  const labels: ApiTicket['status'][] = ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing', 'resolved', 'closed'];
  return labels
    .map((status) => ({
      name: formatStatusLabel(status),
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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string; payload?: { detail?: string } }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const detail = payload[0]?.payload?.detail;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: '8px', minWidth: '100px' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 4px' }}>{label}</p>
      {detail ? <p style={{ color: '#9ca3af', fontSize: '11px', margin: '0 0 6px' }}>{detail}</p> : null}
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
  const ticketScope = useMemo(() => getTicketListScope(user), [user]);
  const { tickets: orgTickets } = useTicketList(user ? ticketScope : undefined);
  const { tickets: personalTickets } = useTicketList(user ? { scope: 'assigned' } : undefined);
  const { throughput } = useTicketThroughput(Boolean(user));
  const [solvedPeriod, setSolvedPeriod] = useState('7d');
  const { solvedByAssignee, loading: solvedLoading } = useSolvedByAssignee(solvedPeriod, Boolean(user));

  const counts = useMemo(() => ({
    p1: orgTickets.filter((t) => t.priority === 'P1').length,
    p2: orgTickets.filter((t) => t.priority === 'P2').length,
    p3: orgTickets.filter((t) => t.priority === 'P3').length,
    active: orgTickets.filter((t) => ACTIVE_TICKET_STATUSES.has(t.status)).length,
    inProgress: orgTickets.filter((t) => t.status === 'in_progress').length,
    resolved: orgTickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
  }), [orgTickets]);

  const personalCounts = useMemo(() => ({
    active: personalTickets.filter((t) => ACTIVE_TICKET_STATUSES.has(t.status)).length,
    inProgress: personalTickets.filter((t) => t.status === 'in_progress').length,
    resolved: personalTickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
  }), [personalTickets]);

  const statusMix = useMemo(() => buildStatusMix(orgTickets), [orgTickets]);
  const ageBuckets = useMemo(() => buildAgeBuckets(orgTickets), [orgTickets]);
  const completionPct = orgTickets.length ? Math.round((counts.resolved / orgTickets.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Dashboard</h1>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Active Tickets</h3>
              <div className="stat-value">{counts.active}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Your Active: {personalCounts.active}</p>
            </div>
            <div className="stat-card">
              <h3>In Progress</h3>
              <div className="stat-value" style={{ color: '#fbbf24' }}>{counts.inProgress}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Your In Progress: {personalCounts.inProgress}</p>
            </div>
            <div className="stat-card">
              <h3>Resolved</h3>
              <div className="stat-value" style={{ color: '#34c759' }}>{counts.resolved}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Your Resolved: {personalCounts.resolved}</p>
            </div>
          </div>

          {/* Priority workload mini cards */}
          <div className="workload-grid" style={{ marginBottom: '32px' }}>
                {[
                  { label: 'P1 Critical', val: counts.p1, color: '#ff3b30', pct: orgTickets.length ? (counts.p1 / orgTickets.length) * 100 : 0 },
                  { label: 'P2 High', val: counts.p2, color: '#ff9500', pct: orgTickets.length ? (counts.p2 / orgTickets.length) * 100 : 0 },
                  { label: 'P3 Tickets', val: counts.p3, color: '#34c759', pct: orgTickets.length ? (counts.p3 / orgTickets.length) * 100 : 0 },
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
              <h4 className="chart-card-title">Throughput: Created vs Resolved vs Rerouted</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={throughput} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="created" name="Created" stroke="#60a5fa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#34c759" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="rerouted" name="Rerouted" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4 className="chart-card-title">Organization Task Progress</h4>
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
              <h4 className="chart-card-title">Aging Risk</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageBuckets} margin={{ top: 4, right: 12, bottom: 0, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis width={46} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={true} axisLine={true} allowDecimals={false}>
                    <Label value="Tickets" angle={-90} position="insideLeft" offset={8} fill="#6b7280" style={{ fontSize: 10 }} />
                  </YAxis>
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Active tickets" radius={[4, 4, 0, 0]}>
                    {ageBuckets.map((bucket) => <Cell key={bucket.name} fill={bucket.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SolvedByAssigneeChart
              data={solvedByAssignee.map((row) => ({ ...row, takeovers: row.takeovers ?? 0 }))}
              period={solvedPeriod}
              loading={solvedLoading}
              onPeriodChange={setSolvedPeriod}
              chipClassName="sa-filter-chip"
            />
          </motion.div>

        </Container>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
