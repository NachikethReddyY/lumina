import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ticketsApi, type AdminWorkload, type ApiTicket } from '../utils/apiClient';
import './Dashboard.css';

export function AdminDashboard() {
  const { user } = useCurrentUser();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [workload, setWorkload] = useState<AdminWorkload[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

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
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const filteredTickets = useMemo(
    () => tickets.filter((ticket) => filterStatus === 'all' || ticket.status === filterStatus),
    [tickets, filterStatus]
  );

  const counts = useMemo(
    () => ({
      p1: tickets.filter((ticket) => ticket.priority === 'P1').length,
      p2: tickets.filter((ticket) => ticket.priority === 'P2').length,
      p3: tickets.filter((ticket) => ticket.priority === 'P3').length,
      p4: tickets.filter((ticket) => ticket.priority === 'P4').length,
    }),
    [tickets]
  );

  const resolvedTickets = tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length;
  const inProgressTickets = tickets.filter((ticket) => ticket.status === 'in_progress').length;
  const myLoad = workload.find((entry) => entry.id === user?.id);

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">{user?.role === 'super_admin' ? 'Operations Dashboard' : 'Admin Dashboard'}</h1>
                <p className="dashboard-subtitle">Monitor live ticket load, act on your queue, and reroute when needed.</p>
              </div>
            </div>
          </motion.div>

          <div className="stats-grid">
            <div className="stat-card"><h3>Total Tickets</h3><div className="stat-value">{tickets.length}</div></div>
            <div className="stat-card"><h3>In Progress</h3><div className="stat-value" style={{ color: '#fbbf24' }}>{inProgressTickets}</div></div>
            <div className="stat-card"><h3>Resolved</h3><div className="stat-value" style={{ color: '#34c759' }}>{resolvedTickets}</div></div>
          </div>

          <div className="workload-grid">
            <div className="workload-card">
              <h4>P1 Critical</h4>
              <div className="workload-value">{counts.p1}</div>
              <div className="workload-bar"><div className="workload-fill" style={{ width: `${tickets.length ? (counts.p1 / tickets.length) * 100 : 0}%`, background: '#ff3b30' }} /></div>
            </div>
            <div className="workload-card">
              <h4>P2 High</h4>
              <div className="workload-value">{counts.p2}</div>
              <div className="workload-bar"><div className="workload-fill" style={{ width: `${tickets.length ? (counts.p2 / tickets.length) * 100 : 0}%`, background: '#ff9500' }} /></div>
            </div>
            <div className="workload-card">
              <h4>P3/P4 Backlog</h4>
              <div className="workload-value">{counts.p3 + counts.p4}</div>
              <div className="workload-bar"><div className="workload-fill" style={{ width: `${tickets.length ? ((counts.p3 + counts.p4) / tickets.length) * 100 : 0}%`, background: '#34c759' }} /></div>
            </div>
            <div className="workload-card">
              <h4>Your Load Score</h4>
              <div className="workload-value">{myLoad?.load_score ?? 0}</div>
              <div className="workload-bar"><div className="workload-fill" style={{ width: `${Math.min(100, ((myLoad?.load_score ?? 0) / 20) * 100)}%` }} /></div>
            </div>
          </div>

          <motion.div className="admin-controls" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <div className="filter-group">
              <label htmlFor="status-filter">Filter by Status</label>
              <select id="status-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="pending_routing">Pending Routing</option>
              </select>
            </div>
          </motion.div>

          <section className="queue-section">
            <h3>Active Queue</h3>
            {loading ? <p className="ticket-description">Loading queue...</p> : null}
            <div className="queue-list-container">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="queue-item">
                  <div className="queue-item-info">
                    <div className={`status-indicator ${ticket.priority.toLowerCase()}`} />
                    <div className="queue-item-text">
                      <p className="queue-item-title">{ticket.title}</p>
                      <p className="queue-item-meta">
                        {ticket.id} • {ticket.category_name} • {ticket.assigned_to_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div className="queue-item-actions">
                    <span className={`status-badge ${ticket.status}`}>{ticket.status.replace('_', ' ')}</span>
                    {ticket.status === 'open' || ticket.status === 'assigned' ? (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const res = await ticketsApi.updateStatus(ticket.id, 'in_progress');
                          if (res.ok) {
                            setTickets((prev) => prev.map((item) => (item.id === ticket.id ? { ...item, status: 'in_progress' } : item)));
                          }
                        }}
                      >
                        Start
                      </Button>
                    ) : null}
                    {ticket.status === 'in_progress' ? (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const res = await ticketsApi.updateStatus(ticket.id, 'resolved');
                          if (res.ok) {
                            setTickets((prev) => prev.map((item) => (item.id === ticket.id ? { ...item, status: 'resolved' } : item)));
                          }
                        }}
                      >
                        Resolve
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const res = await ticketsApi.reroute(ticket.id);
                        if (res.ok) {
                          const refreshed = await ticketsApi.list({ scope: user?.role === 'admin' ? 'assigned' : undefined });
                          const body = await refreshed.json().catch(() => []);
                          setTickets(Array.isArray(body) ? body : []);
                        }
                      }}
                    >
                      Re-route
                    </Button>
                  </div>
                </div>
              ))}
              {!loading && filteredTickets.length === 0 ? (
                <div className="empty-state">
                  <h3>No tickets found</h3>
                  <p>Try changing your filters or wait for new routing activity.</p>
                </div>
              ) : null}
            </div>
          </section>
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
