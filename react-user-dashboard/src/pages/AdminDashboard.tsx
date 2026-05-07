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

export function AdminDashboard() {
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
      status: 'in_progress',
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
      assignedTo: 'Sarah Chen',
    },
    {
      id: 'TKT-004',
      title: 'Slow Performance on Large Files',
      description: 'System becomes unresponsive with 500MB+ files',
      category: 'software',
      priority: 2,
      status: 'open',
      createdAt: '2026-05-04',
      assignedTo: 'James Miller',
    },
    {
      id: 'TKT-005',
      title: 'Keyboard Keys Sticking',
      description: 'Several keys on keyboard no longer respond',
      category: 'hardware',
      priority: 3,
      status: 'resolved',
      createdAt: '2026-04-20',
      assignedTo: 'Sarah Chen',
    },
  ]);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const getTicketCounts = () => {
    const p1Count = tickets.filter((t) => t.priority === 1).length;
    const p2Count = tickets.filter((t) => t.priority === 2).length;
    const p3Count = tickets.filter((t) => t.priority === 3).length;
    return { p1: p1Count, p2: p2Count, p3: p3Count };
  };

  const getWorkloadLoad = () => {
    const { p1, p2, p3 } = getTicketCounts();
    const totalWeight = p1 * 3 + p2 * 2 + p3 * 1;
    const maxWeight = tickets.length * 3;
    return Math.min(100, (totalWeight / maxWeight) * 100);
  };


  const updateTicketStatus = (ticketId: string, newStatus: Ticket['status']) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, status: newStatus }
          : ticket
      )
    );
  };

  const getFilteredTickets = () => {
    return tickets.filter((ticket) => {
      const statusMatch =
        filterStatus === 'all' || ticket.status === filterStatus;
      const priorityMatch =
        filterPriority === 'all' ||
        ticket.priority === parseInt(filterPriority);
      return statusMatch && priorityMatch;
    });
  };

  const inProgressTickets = tickets.filter(
    (t) => t.status === 'in_progress'
  ).length;
  const resolvedTickets = tickets.filter(
    (t) => t.status === 'resolved'
  ).length;

  const filteredTickets = getFilteredTickets();
  const counts = getTicketCounts();

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
                <h1 className="dashboard-title">Admin Dashboard</h1>
                <p className="dashboard-subtitle">Monitor and manage all support tickets</p>
              </div>
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
              <h3>In Progress</h3>
              <div className="stat-value" style={{ color: '#fbbf24' }}>
                {inProgressTickets}
              </div>
            </div>
            <div className="stat-card">
              <h3>Resolved</h3>
              <div className="stat-value" style={{ color: '#34c759' }}>
                {resolvedTickets}
              </div>
            </div>
          </motion.div>

          {/* Workload Metrics */}
          <motion.div
            className="workload-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="workload-card">
              <h4>P1 Critical</h4>
              <div className="workload-value">{counts.p1}</div>
              <div className="workload-bar">
                <div
                  className="workload-fill"
                  style={{
                    width: `${(counts.p1 / Math.max(1, counts.p1 + counts.p2 + counts.p3)) * 100}%`,
                    background: '#ff3b30',
                    boxShadow: '0 0 12px rgba(255, 59, 48, 0.4)',
                  }}
                />
              </div>
            </div>

            <div className="workload-card">
              <h4>P2 High</h4>
              <div className="workload-value">{counts.p2}</div>
              <div className="workload-bar">
                <div
                  className="workload-fill"
                  style={{
                    width: `${(counts.p2 / Math.max(1, counts.p1 + counts.p2 + counts.p3)) * 100}%`,
                    background: '#ff9500',
                    boxShadow: '0 0 12px rgba(255, 149, 0, 0.4)',
                  }}
                />
              </div>
            </div>

            <div className="workload-card">
              <h4>P3 Normal</h4>
              <div className="workload-value">{counts.p3}</div>
              <div className="workload-bar">
                <div
                  className="workload-fill"
                  style={{
                    width: `${(counts.p3 / Math.max(1, counts.p1 + counts.p2 + counts.p3)) * 100}%`,
                    background: '#34c759',
                    boxShadow: '0 0 12px rgba(52, 199, 89, 0.4)',
                  }}
                />
              </div>
            </div>

            <div className="workload-card">
              <h4>Overall Load</h4>
              <div className="workload-value">
                {Math.round(getWorkloadLoad())}%
              </div>
              <div className="workload-bar">
                <div
                  className="workload-fill"
                  style={{ width: `${getWorkloadLoad()}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            className="admin-controls"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="filter-group">
              <label htmlFor="status-filter">Filter by Status</label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="priority-filter">Filter by Priority</label>
              <select
                id="priority-filter"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="1">P1 - Critical</option>
                <option value="2">P2 - High</option>
                <option value="3">P3 - Normal</option>
              </select>
            </div>
          </motion.div>

          {/* Queue Section */}
          <motion.div
            className="queue-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3>Ticket Queue</h3>

            {filteredTickets.length > 0 ? (
              <div className="queue-list-container">
                {filteredTickets.map((ticket, idx) => (
                  <motion.div
                    key={ticket.id}
                    className="queue-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="queue-item-info">
                      <div
                        className={`status-indicator p${ticket.priority}`}
                      />
                      <div className="queue-item-text">
                        <p className="queue-item-title">{ticket.title}</p>
                        <p className="queue-item-meta">
                          {ticket.id} • {ticket.category} • Assigned to{' '}
                          {ticket.assignedTo || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    <div className="queue-item-actions">
                      <span
                        className={`status-badge ${ticket.status}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>

                      {ticket.status === 'open' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            updateTicketStatus(ticket.id, 'in_progress')
                          }
                        >
                          Start
                        </Button>
                      )}

                      {ticket.status === 'in_progress' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            updateTicketStatus(ticket.id, 'resolved')
                          }
                        >
                          Resolve
                        </Button>
                      )}

                      {ticket.status === 'resolved' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateTicketStatus(ticket.id, 'closed')
                          }
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No tickets found</h3>
                <p>Try adjusting your filters</p>
              </div>
            )}
          </motion.div>
        </Container>
      </div>
  );
}

export default AdminDashboard;
