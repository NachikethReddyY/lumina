import { useCallback, useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Container from '../components/Container';
import CreateTicketModal from '../components/CreateTicketModal';
import DashboardLayout from '../components/DashboardLayout';
import { ChartSkeleton } from '../components/charts/chartConstants';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { invalidateTicketListCache, useTicketList } from '../hooks/useTicketData';
import { type ApiTicket } from '../utils/apiClient';
import { formatStatusLabel } from './admin/dashboardShared';
import './Dashboard.css';

const LazyUserDashboardCharts = lazy(() => import('../components/charts/UserDashboardCharts'));

const PRIORITY_COLOR: Record<string, string> = {
  P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280',
};
const STATUS_COLOR: Record<string, string> = {
  open: '#ff6b6b', assigned: '#60a5fa', in_progress: '#fbbf24',
  resolved: '#34c759', closed: '#6b7280', on_hold: '#9ca3af', pending_routing: '#d97706',
};

function buildDailyLine(tickets: ApiTicket[]) {
  const days: Record<string, number> = {};
  const now = Date.now();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    days[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
  }
  tickets.forEach((t) => {
    const label = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (label in days) days[label]++;
  });
  return Object.entries(days).map(([date, count]) => ({ date, count }));
}

function buildStatusBar(tickets: ApiTicket[]) {
  const labels: ApiTicket['status'][] = ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing', 'resolved', 'closed'];
  const counts = tickets.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {});

  return labels
    .map((status) => ({
      status: formatStatusLabel(status),
      count: counts[status] || 0,
      fill: STATUS_COLOR[status] || '#6b7280',
    }))
    .filter((entry) => entry.count > 0 || entry.status === 'on hold');
}

function buildPriorityBar(tickets: ApiTicket[]) {
  const map: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  tickets.forEach((t) => { map[t.priority] = (map[t.priority] || 0) + 1; });
  return ['P1', 'P2', 'P3', 'P4'].map((priority) => ({
    priority,
    count: map[priority],
    fill: PRIORITY_COLOR[priority],
  }));
}

export function UserDashboard() {
  const { user } = useCurrentUser();
  const { tickets, mutate } = useTicketList(user ? { scope: 'submitted' } : undefined);
  const { tickets: orgTickets } = useTicketList(user ? { scope: 'org' } : undefined);
  const [showNewTicket, setShowNewTicket] = useState(false);

  const openNewTicket = useCallback(() => setShowNewTicket(true), []);
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        openNewTicket();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openNewTicket]);

  const openCount = tickets.filter((t) => ['open', 'assigned', 'in_progress', 'pending_routing'].includes(t.status)).length;
  const resolvedCount = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const orgOpenCount = orgTickets.filter((t) => ['open', 'assigned', 'in_progress', 'pending_routing'].includes(t.status)).length;
  const orgResolvedCount = orgTickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;

  const dailyLine = useMemo(() => buildDailyLine(tickets), [tickets]);
  const statusBar = useMemo(() => buildStatusBar(tickets), [tickets]);
  const priorityBar = useMemo(() => buildPriorityBar(tickets), [tickets]);

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Welcome, {user?.first_name || 'there'}</h1>
              </div>
              <Button variant="primary" size="lg" onClick={() => setShowNewTicket(true)}>
                New Ticket
              </Button>
            </div>
          </motion.div>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>Your Tickets</h3>
              <div className="stat-value">{tickets.length}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Org Total: {orgTickets.length}</p>
            </div>
            <div className="stat-card">
              <h3>To Do Queue</h3>
              <div className="stat-value" style={{ color: '#fbbf24' }}>{openCount}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Org Total: {orgOpenCount}</p>
            </div>
            <div className="stat-card">
              <h3>Finished</h3>
              <div className="stat-value" style={{ color: '#34c759' }}>{resolvedCount}</div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Org Total: {orgResolvedCount}</p>
            </div>
          </div>

          {tickets.length > 0 && (
            <Suspense fallback={<ChartSkeleton height={180} />}>
              <LazyUserDashboardCharts dailyLine={dailyLine} statusBar={statusBar} priorityBar={priorityBar} />
            </Suspense>
          )}

          <CreateTicketModal
            open={showNewTicket}
            onClose={() => setShowNewTicket(false)}
            onCreated={(ticket) => {
              invalidateTicketListCache();
              void mutate((prev) => [ticket, ...(prev ?? [])]);
            }}
          />
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default UserDashboard;
