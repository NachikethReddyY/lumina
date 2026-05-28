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
import { isOrgViewer, isQaUser } from '../utils/orgRoles';
import { formatStatusLabel } from './admin/dashboardShared';
import './Dashboard.css';

const LazyUserDashboardCharts = lazy(() => import('../components/charts/UserDashboardCharts'));

type DashboardTab = 'working' | 'organisation';

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
  const isQA = isQaUser(user);
  const canSeeOrgTotals = isOrgViewer(user);
  const [activeTab, setActiveTab] = useState<DashboardTab>('working');

  const { tickets, mutate } = useTicketList(
    user ? { scope: isQA ? 'assigned' : 'submitted' } : undefined
  );
  const { tickets: orgTickets } = useTicketList(user && canSeeOrgTotals ? { scope: 'org' } : undefined);
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

  // Determine which tickets to display based on active tab
  const displayTickets = activeTab === 'working' ? tickets : orgTickets;

  const openCount = displayTickets.filter((t) => ['open', 'assigned', 'in_progress', 'pending_routing'].includes(t.status)).length;
  const resolvedCount = displayTickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;

  const dailyLine = useMemo(() => buildDailyLine(displayTickets), [displayTickets]);
  const statusBar = useMemo(() => buildStatusBar(displayTickets), [displayTickets]);
  const priorityBar = useMemo(() => buildPriorityBar(displayTickets), [displayTickets]);

  const label = isQA
    ? { total: activeTab === 'working' ? 'My QA Queue' : 'Organisation Tickets', active: 'Active', done: 'Resolved' }
    : { total: 'Your Tickets', active: 'To Do Queue', done: 'Finished' };

  const pageSubtitle = isQA && activeTab === 'working'
    ? 'Tickets assigned to you with inline inspection'
    : isQA && activeTab === 'organisation'
    ? 'All organization tickets'
    : undefined;

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Welcome, {user?.first_name || 'there'}</h1>
                {isQA && pageSubtitle && (
                  <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Ticket Queue • {pageSubtitle}</p>
                )}
              </div>
              <Button variant="primary" size="lg" onClick={() => setShowNewTicket(true)}>
                New Ticket
              </Button>
            </div>
          </motion.div>

          {isQA && canSeeOrgTotals && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('working')}
                className={activeTab === 'working' ? 'active' : ''}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === 'working' ? '#111827' : '#e5e7eb',
                  backgroundColor: activeTab === 'working' ? '#111827' : 'transparent',
                  color: activeTab === 'working' ? '#ffffff' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Working <span style={{ marginLeft: '4px', fontSize: '12px' }}>({tickets.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('organisation')}
                className={activeTab === 'organisation' ? 'active' : ''}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === 'organisation' ? '#111827' : '#e5e7eb',
                  backgroundColor: activeTab === 'organisation' ? '#111827' : 'transparent',
                  color: activeTab === 'organisation' ? '#ffffff' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Organisation <span style={{ marginLeft: '4px', fontSize: '12px' }}>({orgTickets.length})</span>
              </button>
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <h3>{label.total}</h3>
              <div className="stat-value">{displayTickets.length}</div>
            </div>
            <div className="stat-card">
              <h3>{label.active}</h3>
              <div className="stat-value" style={{ color: '#fbbf24' }}>{openCount}</div>
            </div>
            <div className="stat-card">
              <h3>{label.done}</h3>
              <div className="stat-value" style={{ color: '#34c759' }}>{resolvedCount}</div>
            </div>
          </div>

          {displayTickets.length > 0 && (
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
