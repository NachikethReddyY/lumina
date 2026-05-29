import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import Container from '../../components/Container';
import DashboardLayout from '../../components/DashboardLayout';
import { apiAssetUrl } from '../../utils/apiBase';
import { formatUserEmailAndRole } from '../../utils/userDisplay';
import { useToast } from '../../context/useToast';
import { useUsersList } from '../../hooks/useUsersList';
import { usersApi } from '../../utils/apiClient';
import { AdminPageHeader, AdminPageShell } from './dashboardShared';
import '../Dashboard.css';
import '../HrDashboard.css';

export function AdminApprovalsPage() {
  const { users, setUsers, loading, reload } = useUsersList();
  const { showToast } = useToast();
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const [approvingId, setApprovingId] = useState<{ id: string; action: 'active' | 'rejected' } | null>(null);

  const handleApproval = async (id: string, status: 'active' | 'suspended') => {
    setApprovingId({ id, action: status === 'active' ? 'active' : 'rejected' });
    const res = await usersApi.updateApproval(id, status);
    setApprovingId(null);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
      showToast(status === 'active' ? 'User approved.' : 'User rejected.', 'success');
    }
  };

  if (loading) {
    return <DashboardLayout><div className="dashboard-content" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <AdminPageShell>
        <Container maxWidth="xl">
          {approvingId && (
            <div className="approval-loading-toast">
              <span className="approval-loading-spinner" />
              {approvingId.action === 'active' ? 'Approving account…' : 'Rejecting account…'}
            </div>
          )}
          <AdminPageHeader
            title="Approval Queue"
            subtitle="Review and approve new account requests."
          />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <section className="tickets-section">
              {pendingUsers.length > 0 ? (
                <div className="queue-list-container">
                  {pendingUsers.map((account) => (
                    <div key={account.id} className="queue-item">
                      <div className="queue-item-info">
                        <div className="sa-user-avatar queue-avatar">
                          {account.avatar_url
                            ? <img src={apiAssetUrl(account.avatar_url)} alt="" />
                            : `${account.first_name[0]}${account.last_name[0]}`}
                        </div>
                        <div className="queue-item-text">
                          <p className="queue-item-title">{account.first_name} {account.last_name}</p>
                          <p className="queue-item-meta">{formatUserEmailAndRole(account)}</p>
                        </div>
                      </div>
                      <div className="queue-item-actions">
                        <Button variant="primary" loading={approvingId?.id === account.id && approvingId.action === 'active'} onClick={() => handleApproval(account.id, 'active')}>Approve</Button>
                        <Button variant="secondary" loading={approvingId?.id === account.id && approvingId.action === 'rejected'} onClick={() => handleApproval(account.id, 'suspended')}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No pending approvals</h3>
                  <p>New account requests will appear here.</p>
                  <button type="button" className="sa-btn" style={{ marginTop: '12px' }} onClick={() => void reload()}>
                    Refresh
                  </button>
                </div>
              )}
            </section>
          </motion.div>
        </Container>
      </AdminPageShell>
    </DashboardLayout>
  );
}

export default AdminApprovalsPage;
