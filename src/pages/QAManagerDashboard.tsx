import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, Legend, Label,
} from 'recharts';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useSolvedByAssignee, useTicketList, useTicketThroughput } from '../hooks/useTicketData';
import { SolvedByAssigneeChart } from '../components/charts/SolvedByAssigneeChart';
import { type ApiTicket } from '../utils/apiClient';
import './Dashboard.css';

const STATUS_COLOR: Record<string, string> = {
  open: '#ff6b6b', assigned: '#60a5fa', in_progress: '#fbbf24',
  resolved: '#34c759', closed: '#6b7280', on_hold: '#9ca3af', pending_routing: '#d97706',
};

const TYPE_COLOR: Record<ApiTicket['type'], string> = {
  bug: '#ff3b30',
  incident: '#ff9500',
  software: '#60a5fa',
};

const ACTIVE_STATUSES = new Set<ApiTicket['status']>(['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing']);

function buildTypePie(tickets: ApiTicket[]) {
  const map: Record<string, number> = { bug: 0, incident: 0, software: 0 };
  tickets.forEach((t) => { map[t.type] = (map[t.type] || 0) + 1; });
  return (['bug', 'incident', 'software'] as const)
    .map((type) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), value: map[type], fill: TYPE_COLOR[type] }))
    .filter((e) => e.value > 0);
}

function buildQaAssigneeLoad(tickets: ApiTicket[]) {
  const map: Record<string, number> = {};
  tickets
    .filter((t) => t.qa_assignee_id && ACTIVE_STATUSES.has(t.status))
    .forEach((t) => {
      const name = t.qa_assignee_name || t.qa_assignee_id || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function buildStatusMix(tickets: ApiTicket[]) {
  const labels: ApiTicket['status'][] = ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing', 'resolved', 'closed'];
  return labels
    .map((status) => ({
      name: status.replace(/_/g, ' '),
      value: tickets.filter((t) => t.status === status).length,
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
    .filter((t) => t.qa_assignee_id && ACTIVE_STATUSES.has(t.status))
    .forEach((t) => {
      const ageDays = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000);
      if (ageDays <= 1) buckets[0].value++;
      else if (ageDays <= 3) buckets[1].value++;
      else if (ageDays <= 7) buckets[2].value++;
      else buckets[3].value++;
    });
  return buckets;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
}) => {
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

export function QAManagerDashboard() {
  const { user } = useCurrentUser();
  const { tickets: orgTickets } = useTicketList(user ? { scope: 'org' } : undefined);
  const { tickets: myTickets } = useTicketList(user ? { scope: 'assigned' } : undefined);
  const { throughput } = useTicketThroughput(Boolean(user));
  const [solvedPeriod, setSolvedPeriod] = useState('7d');
  const { solvedByAssignee, loading: solvedLoading } = useSolvedByAssignee(solvedPeriod, Boolean(user));

  const qaTickets = useMemo(
    () => orgTickets.filter((t) => t.qa_assignee_id),
    [orgTickets]
  );

  const bugTickets = useMemo(
    () => orgTickets.filter((t) => t.type === 'bug' || t.type === 'incident'),
    [orgTickets]
  );

  const stats = useMemo(() => ({
    qaAssigned: qaTickets.length,
    qaActive: qaTickets.filter((t) => ACTIVE_STATUSES.has(t.status)).length,
    qaResolved: qaTickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
    bugActive: bugTickets.filter((t) => ACTIVE_STATUSES.has(t.status)).length,
    myActive: myTickets.filter((t) => ACTIVE_STATUSES.has(t.status)).length,
    myResolved: myTickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
  }), [qaTickets, bugTickets, myTickets]);

  const typePie = useMemo(() => buildTypePie(orgTickets), [orgTickets]);
  const qaAssigneeLoad = useMemo(() => buildQaAssigneeLoad(orgTickets), [orgTickets]);
  const statusMix = useMemo(() => buildStatusMix(qaTickets), [qaTickets]);
  const ageBuckets = useMemo(() => buildAgeBuckets(orgTickets), [orgTickets]);
  const completionPct = qaTickets.length ? Math.round((stats.qaResolved / qaTickets.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div
            className="dashboard-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">QA Manager Dashboard</h1>
                <p className="dashboard-subtitle">Quality assurance overview &amp; team workload</p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>QA Queue</h3>
              <div className="stat-value">{stats.qaActive}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Total QA assigned: {stats.qaAssigned}
              </p>
            </div>
            <div className="stat-card">
              <h3>Bugs &amp; Incidents</h3>
              <div className="stat-value" style={{ color: '#ff3b30' }}>{stats.bugActive}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Active open issues</p>
            </div>
            <div className="stat-card">
              <h3>QA Resolved</h3>
              <div className="stat-value" style={{ color: '#34c759' }}>{stats.qaResolved}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Your active: {stats.myActive} &nbsp;·&nbsp; resolved: {stats.myResolved}
              </p>
            </div>
          </div>

          {/* Charts */}
          <motion.div
            className="charts-grid"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Ticket type breakdown */}
            <div className="chart-card">
              <h4 className="chart-card-title">Ticket Type Breakdown</h4>
              <div className="progress-donut-shell">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={typePie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2}>
                      {typePie.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="progress-donut-label">
                  <strong>{completionPct}%</strong>
                  <span>QA done</span>
                </div>
              </div>
              <div className="dashboard-chart-legend">
                {typePie.map((e) => (
                  <span key={e.name}><i style={{ background: e.fill }} />{e.name}</span>
                ))}
              </div>
            </div>

            {/* QA assignee workload */}
            <div className="chart-card">
              <h4 className="chart-card-title">QA Assignee Load (Active)</h4>
              {qaAssigneeLoad.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '24px', textAlign: 'center' }}>No active QA assignments</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={qaAssigneeLoad} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Active tickets" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* QA ticket status mix */}
            <div className="chart-card">
              <h4 className="chart-card-title">QA Queue Status Mix</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusMix} margin={{ top: 4, right: 12, bottom: 0, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis width={46} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine axisLine allowDecimals={false}>
                    <Label value="Tickets" angle={-90} position="insideLeft" offset={8} fill="#6b7280" style={{ fontSize: 10 }} />
                  </YAxis>
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                    {statusMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* QA aging risk */}
            <div className="chart-card">
              <h4 className="chart-card-title">QA Aging Risk</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageBuckets} margin={{ top: 4, right: 12, bottom: 0, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis width={46} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine axisLine allowDecimals={false}>
                    <Label value="Tickets" angle={-90} position="insideLeft" offset={8} fill="#6b7280" style={{ fontSize: 10 }} />
                  </YAxis>
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="QA tickets" radius={[4, 4, 0, 0]}>
                    {ageBuckets.map((b) => <Cell key={b.name} fill={b.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Throughput */}
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

export default QAManagerDashboard;
