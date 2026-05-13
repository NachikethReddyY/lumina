import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { categoriesApi, ticketsApi, type ApiCategory, type ApiTicket } from '../utils/apiClient';
import './Dashboard.css';

function getPriorityLabel(priority: ApiTicket['priority']) {
  return priority;
}

function getStatusColor(status: ApiTicket['status']) {
  const colors: Record<ApiTicket['status'], string> = {
    open: '#ff6b6b',
    assigned: '#5ea3ff',
    in_progress: '#fbbf24',
    resolved: '#34c759',
    closed: '#6b7280',
    on_hold: '#9ca3af',
    pending_routing: '#d97706',
  };
  return colors[status];
}

export function UserDashboard() {
  const { user } = useCurrentUser();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    categoryId: '',
    type: 'software' as 'hardware' | 'software' | 'bug',
    priority: 'P2' as 'P1' | 'P2' | 'P3' | 'P4',
    replicationSteps: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketsRes, categoriesRes] = await Promise.all([ticketsApi.list(), categoriesApi.list()]);
        const [ticketsBody, categoriesBody] = await Promise.all([ticketsRes.json(), categoriesRes.json()]);
        if (cancelled) return;
        const loadedCategories = Array.isArray(categoriesBody) ? categoriesBody : [];
        setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
        setCategories(loadedCategories);
        setNewTicket((prev) => ({
          ...prev,
          categoryId: prev.categoryId || loadedCategories[0]?.id || '',
        }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openTickets = tickets.filter((ticket) => ['open', 'assigned', 'in_progress', 'pending_routing'].includes(ticket.status)).length;
  const resolvedTickets = tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length;
  const latestTicket = useMemo(() => tickets[0], [tickets]);

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Welcome, {user?.first_name || 'User'}</h1>
                <p className="dashboard-subtitle">Submit issues, track progress, and follow your assigned support path.</p>
              </div>
              <Button variant="primary" size="lg" onClick={() => setShowNewTicket(true)}>
                New Ticket
              </Button>
            </div>
          </motion.div>

          <div className="stats-grid">
            <div className="stat-card"><h3>Total Tickets</h3><div className="stat-value">{tickets.length}</div></div>
            <div className="stat-card"><h3>Open Queue</h3><div className="stat-value">{openTickets}</div></div>
            <div className="stat-card"><h3>Resolved</h3><div className="stat-value" style={{ color: '#34c759' }}>{resolvedTickets}</div></div>
          </div>

          {latestTicket ? (
            <div className="workload-grid">
              <div className="workload-card">
                <h4>Latest Ticket</h4>
                <div className="workload-value" style={{ fontSize: '22px', fontFamily: 'inherit' }}>{latestTicket.title}</div>
                <p className="ticket-description">{latestTicket.status.replace('_', ' ')} • {latestTicket.category_name}</p>
              </div>
            </div>
          ) : null}

          {showNewTicket ? (
            <motion.div className="new-ticket-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="form-header">
                <h2>Create New Ticket</h2>
                <button className="close-btn" onClick={() => setShowNewTicket(false)}>x</button>
              </div>
              {formError ? <p className="auth-error">{formError}</p> : null}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setFormError('');
                  const res = await ticketsApi.create(newTicket);
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setFormError(body.error || body.message || 'Could not create ticket.');
                    return;
                  }
                  setTickets((prev) => [body as ApiTicket, ...prev]);
                  setNewTicket({
                    title: '',
                    description: '',
                    categoryId: categories[0]?.id || '',
                    type: 'software',
                    priority: 'P2',
                    replicationSteps: '',
                  });
                  setShowNewTicket(false);
                }}
                className="ticket-form"
              >
                <div className="form-group">
                  <label>Title *</label>
                  <input value={newTicket.title} onChange={(e) => setNewTicket((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea rows={4} value={newTicket.description} onChange={(e) => setNewTicket((prev) => ({ ...prev, description: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={newTicket.categoryId} onChange={(e) => setNewTicket((prev) => ({ ...prev, categoryId: e.target.value }))}>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={newTicket.type} onChange={(e) => setNewTicket((prev) => ({ ...prev, type: e.target.value as 'hardware' | 'software' | 'bug' }))}>
                      <option value="hardware">Hardware</option>
                      <option value="software">Software</option>
                      <option value="bug">Bug</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={newTicket.priority} onChange={(e) => setNewTicket((prev) => ({ ...prev, priority: e.target.value as 'P1' | 'P2' | 'P3' | 'P4' }))}>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                      <option value="P4">P4</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Replication Steps</label>
                    <input value={newTicket.replicationSteps} onChange={(e) => setNewTicket((prev) => ({ ...prev, replicationSteps: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <Button variant="secondary" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Create Ticket</Button>
                </div>
              </form>
            </motion.div>
          ) : null}

          <motion.div className="tickets-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <h2>Your Tickets</h2>
            {loading ? <p className="ticket-description">Loading tickets...</p> : null}
            <div className="tickets-grid">
              {tickets.map((ticket) => (
                <motion.div key={ticket.id} className="ticket-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="ticket-header">
                    <div>
                      <h3>{ticket.title}</h3>
                      <p className="ticket-id">{ticket.id}</p>
                    </div>
                    <span className="ticket-priority" style={{ color: getStatusColor(ticket.status) }}>{getPriorityLabel(ticket.priority)}</span>
                  </div>
                  <p className="ticket-description">{ticket.description}</p>
                  <div className="ticket-meta">
                    <div className="meta-item"><span className="label">Category</span><span className="value">{ticket.category_name}</span></div>
                    <div className="meta-item"><span className="label">Status</span><span className="value" style={{ color: getStatusColor(ticket.status) }}>{ticket.status.replace('_', ' ')}</span></div>
                    <div className="meta-item"><span className="label">Assigned To</span><span className="value">{ticket.assigned_to_name || 'Pending routing'}</span></div>
                  </div>
                  <div className="ticket-footer">
                    <span className="created-date">{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default UserDashboard;
