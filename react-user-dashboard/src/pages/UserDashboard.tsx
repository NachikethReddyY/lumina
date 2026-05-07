import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Container from '../components/Container';
import './Dashboard.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'hardware' | 'software' | 'bug';
  priority: 1 | 2 | 3;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  assignedTo?: string;
}

export function UserDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 'TKT-001',
      title: 'Laptop Screen Flickering',
      description: 'My laptop screen flickers intermittently',
      category: 'hardware',
      priority: 2,
      status: 'in_progress',
      createdAt: '2026-05-01',
      assignedTo: 'Sarah Chen',
    },
    {
      id: 'TKT-002',
      title: 'Password Reset Not Working',
      description: 'Unable to reset password via email link',
      category: 'software',
      priority: 1,
      status: 'resolved',
      createdAt: '2026-04-28',
      assignedTo: 'James Miller',
    },
    {
      id: 'TKT-003',
      title: 'App Crashes on Launch',
      description: 'Application crashes immediately after opening',
      category: 'bug',
      priority: 1,
      status: 'open',
      createdAt: '2026-05-05',
    },
  ]);

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState<{
    title: string;
    description: string;
    category: 'hardware' | 'software' | 'bug';
    priority: 1 | 2 | 3;
  }>({
    title: '',
    description: '',
    category: 'software',
    priority: 2,
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTicket.title.trim()) {
      setTickets((prev) => [
        {
          id: `TKT-${String(prev.length + 1).padStart(3, '0')}`,
          ...newTicket,
          status: 'open',
          createdAt: new Date().toISOString().split('T')[0],
        },
        ...prev,
      ]);
      setNewTicket({ title: '', description: '', category: 'software', priority: 2 });
      setShowNewTicket(false);
    }
  };

  const getPriorityLabel = (priority: number) => {
    const labels: { [key: number]: string } = {
      1: 'Critical',
      2: 'High',
      3: 'Normal',
    };
    return labels[priority] || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      open: '#ff6b6b',
      in_progress: '#fbbf24',
      resolved: '#34c759',
      closed: '#6b7280',
    };
    return colors[status] || '#a0a8b8';
  };

  const openTickets = tickets.filter((t) => t.status === 'open').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          {/* Dashboard Header */}
          <motion.div
            className="dashboard-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Welcome, User</h1>
                <p className="dashboard-subtitle">Manage your support tickets</p>
              </div>
              <Button variant="primary" size="lg" onClick={() => setShowNewTicket(true)}>
                New Ticket
              </Button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            className="stats-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="stat-card">
              <h3>Total Tickets</h3>
              <div className="stat-value">{tickets.length}</div>
            </div>
            <div className="stat-card">
              <h3>Open</h3>
              <div className="stat-value">{openTickets}</div>
            </div>
            <div className="stat-card">
              <h3>Resolved</h3>
              <div className="stat-value" style={{ color: '#34c759' }}>
                {resolvedTickets}
              </div>
            </div>
          </motion.div>

          {/* New Ticket Form */}
          {showNewTicket && (
            <motion.div
              className="new-ticket-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="form-header">
                <h2>Create New Ticket</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowNewTicket(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="ticket-form">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={newTicket.title}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, title: e.target.value })
                    }
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, description: e.target.value })
                    }
                    placeholder="Provide more details about the issue"
                    rows={4}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewTicket({
                          ...newTicket,
                          category: value as 'hardware' | 'software' | 'bug',
                        });
                      }}
                    >
                      <option value="hardware">Hardware</option>
                      <option value="software">Software</option>
                      <option value="bug">Bug Report</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={String(newTicket.priority)}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setNewTicket({
                          ...newTicket,
                          priority: value as 1 | 2 | 3,
                        });
                      }}
                    >
                      <option value="1">Critical</option>
                      <option value="2">High</option>
                      <option value="3">Normal</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setShowNewTicket(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Create Ticket
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Tickets List */}
          <motion.div
            className="tickets-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2>Your Tickets</h2>

            <div className="tickets-grid">
              {tickets.map((ticket, idx) => (
                <motion.div
                  key={ticket.id}
                  className="ticket-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="ticket-header">
                    <div>
                      <h3>{ticket.title}</h3>
                      <p className="ticket-id">{ticket.id}</p>
                    </div>
                    <div
                      className="ticket-priority"
                      style={{ color: getStatusColor(ticket.status) }}
                    >
                      {getPriorityLabel(ticket.priority)}
                    </div>
                  </div>

                  <p className="ticket-description">{ticket.description}</p>

                  <div className="ticket-meta">
                    <div className="meta-item">
                      <span className="label">Category</span>
                      <span className="value">{ticket.category}</span>
                    </div>
                    <div className="meta-item">
                      <span className="label">Status</span>
                      <span className="value" style={{ color: getStatusColor(ticket.status) }}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="label">Assigned</span>
                      <span className="value">{ticket.assignedTo || 'Pending'}</span>
                    </div>
                  </div>

                  <div className="ticket-footer">
                    <span className="created-date">{ticket.createdAt}</span>
                    <Button variant="text-link">View Details</Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      </div>
  );
}

export default UserDashboard;
