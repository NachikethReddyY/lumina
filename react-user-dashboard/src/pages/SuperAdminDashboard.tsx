import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { ticketsApi, usersApi, type AdminWorkload, type ApiTicket, type ApiUser } from '../utils/apiClient';
import './Dashboard.css';

function BarChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="chart-bars">
      {items.map((item) => (
        <div key={item.label} className="chart-bar-row">
          <div className="chart-bar-label">{item.label}</div>
          <div className="chart-bar-track">
            <div
              className="chart-bar-fill"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
            />
          </div>
          <div className="chart-bar-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function SuperAdminDashboard() {
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [workload, setWorkload] = useState<AdminWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketsRes, usersRes, workloadRes] = await Promise.all([
          ticketsApi.list(),
          usersApi.list(),
          ticketsApi.workload(),
        ]);
        const [ticketsBody, usersBody, workloadBody] = await Promise.all([
          ticketsRes.json(),
          usersRes.json(),
          workloadRes.json(),
        ]);
        if (cancelled) return;
        setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
        setUsers(Array.isArray(usersBody) ? usersBody : []);
        setWorkload(Array.isArray(workloadBody) ? workloadBody : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingUsers = users.filter((user) => user.status === 'pending');
  const activeAdmins = users.filter((user) => user.role !== 'user' && user.status === 'active');
  const approvedUsers = users.filter((user) => user.status === 'active');

  const statusChart = useMemo(() => {
    const statuses = ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'pending_routing'] as const;
    const colors: Record<string, string> = {
      open: '#ff6b6b',
      assigned: '#5ea3ff',
      in_progress: '#fbbf24',
      resolved: '#34c759',
      closed: '#6b7280',
      pending_routing: '#d97706',
    };
    return statuses.map((status) => ({
      label: status.replace('_', ' '),
      value: tickets.filter((ticket) => ticket.status === status).length,
      color: colors[status],
    }));
  }, [tickets]);

  if (loading) {
    return <DashboardLayout><div className="dashboard-content" /></DashboardLayout>;
  }

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
                <h1 className="dashboard-title">Super Admin Control</h1>
                <p className="dashboard-subtitle">Approve access, watch routing health, and balance the system.</p>
              </div>
            </div>
          </motion.div>

          {message ? <p className="auth-notice auth-notice--info">{message}</p> : null}

          <div className="stats-grid">
            <div className="stat-card"><h3>Pending Approval</h3><div className="stat-value">{pendingUsers.length}</div></div>
            <div className="stat-card"><h3>Active Staff</h3><div className="stat-value">{activeAdmins.length}</div></div>
            <div className="stat-card"><h3>Approved Accounts</h3><div className="stat-value">{approvedUsers.length}</div></div>
          </div>

          <div className="super-grid">
            <section className="workload-card">
              <h4>Ticket Status Mix</h4>
              <BarChart items={statusChart} />
            </section>

            <section className="workload-card">
              <h4>Admin Load Score</h4>
              <BarChart
                items={workload.map((item) => ({
                  label: item.first_name,
                  value: item.load_score,
                  color: '#60a5fa',
                }))}
              />
            </section>
          </div>

          <section className="tickets-section">
            <h2>Approval Queue</h2>
            <div className="queue-list-container">
              {pendingUsers.map((account) => (
                <div key={account.id} className="queue-item">
                  <div className="queue-item-info">
                    <div className={`status-indicator ${account.role === 'admin' ? 'p1' : 'p3'}`} />
                    <div className="queue-item-text">
                      <p className="queue-item-title">
                        {account.first_name} {account.last_name}
                      </p>
                      <p className="queue-item-meta">
                        {account.email} • {account.role} • pending
                      </p>
                    </div>
                  </div>
                  <div className="queue-item-actions">
                    <Button
                      variant="primary"
                      onClick={async () => {
                        const res = await usersApi.updateApproval(account.id, 'active');
                        if (res.ok) {
                          setUsers((prev) =>
                            prev.map((user) => (user.id === account.id ? { ...user, status: 'active' } : user))
                          );
                          setMessage(`Approved ${account.email}`);
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const res = await usersApi.updateApproval(account.id, 'suspended');
                        if (res.ok) {
                          setUsers((prev) =>
                            prev.map((user) => (user.id === account.id ? { ...user, status: 'suspended' } : user))
                          );
                          setMessage(`Suspended ${account.email}`);
                        }
                      }}
                    >
                      Suspend
                    </Button>
                  </div>
                </div>
              ))}
              {pendingUsers.length === 0 ? (
                <div className="empty-state">
                  <h3>No pending approvals</h3>
                  <p>Everyone is cleared to work.</p>
                </div>
              ) : null}
            </div>
          </section>
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default SuperAdminDashboard;

