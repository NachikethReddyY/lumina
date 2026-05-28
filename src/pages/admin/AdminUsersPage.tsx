import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Search, Loader } from 'lucide-react';
import Button from '../../components/Button';
import Container from '../../components/Container';
import DashboardLayout from '../../components/DashboardLayout';
import DeleteUserModal from '../../components/DeleteUserModal';
import { usersApi, type ApiUser } from '../../utils/apiClient';
import { apiAssetUrl } from '../../utils/apiBase';
import {
  DEPARTMENT_GROUP_FILTERS,
  getDepartmentGroupLabel,
  getUserRoleLabel,
  matchesDepartmentGroupFilter,
  type DepartmentGroupFilter,
} from '../../utils/userDisplay';
import { useToast } from '../../context/useToast';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { canAccessApprovalQueue, canDeleteAccounts, canSuspendAccounts } from '../../utils/orgRoles';
import { useUsersList } from '../../hooks/useUsersList';
import { AdminPageHeader, AdminPageShell } from './dashboardShared';
import '../Dashboard.css';
import '../SuperAdminDashboard.css';

type StatusFilter = 'all' | 'active' | 'pending' | 'suspended';

export function AdminUsersPage() {
  const { user } = useCurrentUser();
  const showApprovals = canAccessApprovalQueue(user);
  const showSuspend = canSuspendAccounts(user);
  const showDelete = canDeleteAccounts(user);
  const { users, setUsers, loading } = useUsersList();
  const { showToast } = useToast();

  const [departmentGroupFilter, setDepartmentGroupFilter] = useState<DepartmentGroupFilter>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<StatusFilter>('all');
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const statusWeight: Record<ApiUser['status'], number> = { pending: 0, active: 1, suspended: 2 };
    return users
      .filter((u) => {
        const roleOk = matchesDepartmentGroupFilter(u, departmentGroupFilter);
        const statusOk = userStatusFilter === 'all' || u.status === userStatusFilter;
        const searchOk = !userSearch || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase());
        return roleOk && statusOk && searchOk;
      })
      .sort((a, b) => statusWeight[a.status] - statusWeight[b.status] || `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  }, [users, departmentGroupFilter, userStatusFilter, userSearch]);

  const handleApproval = async (id: string, status: 'active' | 'suspended') => {
    setApprovingUserId(id);
    try {
      const res = await usersApi.updateApproval(id, status);
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
        showToast(status === 'active' ? 'User approved.' : 'User suspended.', 'success');
      }
    } finally {
      setApprovingUserId(null);
    }
  };

  const startEditUser = (u: ApiUser) => {
    setEditingUser(u);
    setEditJobTitle(u.job_title || '');
    setEditDepartment(u.department || '');
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setEditJobTitle('');
    setEditDepartment('');
  };

  const saveEditUser = async () => {
    if (!editingUser) return;
    const res = await usersApi.updateProfile(editingUser.id, {
      jobTitle: editJobTitle || undefined,
      department: editDepartment || undefined,
    });
    if (res.ok) {
      const body = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...body.user } : u)));
      showToast('Profile updated.', 'success');
      cancelEditUser();
    } else {
      showToast('Failed to update profile.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await usersApi.delete(deleteTarget.id);
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        showToast(`${deleteTarget.email} removed.`, 'success');
        setDeleteTarget(null);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(data.error || 'Failed to delete user.', 'error');
      }
    } catch {
      showToast('Error deleting user.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="dashboard-content" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <AdminPageShell>
        <Container maxWidth="xl">
          <AdminPageHeader
            title="User Directory"
            subtitle={`${users.length} people across the organization.`}
          />

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="sa-user-filters">
              <div className="sa-search-wrap">
                <Search size={14} className="sa-search-icon" />
                <input
                  className="sa-search-input"
                  placeholder="Search name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="sa-filter-group">
                {DEPARTMENT_GROUP_FILTERS.map((group) => (
                  <button
                    key={group}
                    type="button"
                    className={`sa-filter-chip ${departmentGroupFilter === group ? 'active' : ''}`}
                    onClick={() => setDepartmentGroupFilter(group)}
                  >
                    {getDepartmentGroupLabel(group)}
                  </button>
                ))}
              </div>
              <div className="sa-filter-group">
                {(['all', 'active', 'pending', 'suspended'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`sa-filter-chip ${userStatusFilter === s ? 'active' : ''}`}
                    onClick={() => setUserStatusFilter(s)}
                  >
                    {s === 'all' ? 'All Status' : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="ticket-table-wrap sa-users-table-wrap">
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Job role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="ticket-table-row">
                      <td>
                        <div className="sa-user-cell">
                          <div className="sa-user-avatar">
                            {u.avatar_url
                              ? <img src={apiAssetUrl(u.avatar_url)} alt="" />
                              : `${u.first_name[0]}${u.last_name[0]}`}
                          </div>
                          {u.first_name} {u.last_name}
                        </div>
                      </td>
                      <td className="tbl-muted" style={{ fontSize: '12px' }}>{u.email}</td>
                      <td className="tbl-muted" style={{ fontSize: '12px' }}>
                        {getUserRoleLabel(u) || '—'}
                      </td>
                      <td>
                        <span className={`sa-status-badge ${u.status}`}>{u.status}</span>
                      </td>
                      <td className="tbl-muted tbl-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="sa-action-row">
                          {showApprovals && u.status === 'pending' && (
                            <button type="button" className="sa-btn approve" onClick={() => handleApproval(u.id, 'active')} disabled={approvingUserId === u.id}>
                              {approvingUserId === u.id ? <Loader size={12} className="spin-icon" /> : 'Approve'}
                            </button>
                          )}
                          {showSuspend && u.status !== 'suspended' && u.id !== user?.id && (
                            <button type="button" className="sa-btn suspend" onClick={() => handleApproval(u.id, 'suspended')} disabled={approvingUserId === u.id}>
                              {approvingUserId === u.id ? <Loader size={12} className="spin-icon" /> : 'Suspend'}
                            </button>
                          )}
                          {showApprovals && u.status === 'suspended' && (
                            <button type="button" className="sa-btn approve" onClick={() => handleApproval(u.id, 'active')} disabled={approvingUserId === u.id}>
                              {approvingUserId === u.id ? <Loader size={12} className="spin-icon" /> : 'Restore'}
                            </button>
                          )}
                          {showApprovals && (
                            <button type="button" className="sa-btn" style={{ background: '#e5e7eb', color: '#374151', border: '1px solid #d1d5db' }} onClick={() => startEditUser(u)}>Edit</button>
                          )}
                          {showDelete && u.id !== user?.id && (
                            <button type="button" className="sa-btn delete" onClick={() => setDeleteTarget({ id: u.id, email: u.email })} title="Delete user">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No users match</td></tr>
                  )}
                </tbody>
              </table>
              <div className="sa-users-table-footer" style={{ minHeight: '64px' }} />
            </div>
          </motion.div>

          {editingUser && (
            <motion.div className="nt-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={cancelEditUser}>
              <div className="nt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <div className="nt-modal-header">
                  <h2>Edit Profile</h2>
                  <button type="button" className="nt-close-btn" onClick={cancelEditUser}>✕</button>
                </div>
                <div className="nt-form">
                  <div className="nt-field">
                    <label>Job Title</label>
                    <input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="e.g. Senior Developer" />
                  </div>
                  <div className="nt-field">
                    <label>Department</label>
                    <select value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}>
                      <option value="">No department</option>
                      <option value="Developers">Developers</option>
                      <option value="QA">QA</option>
                      <option value="Managers">Managers</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div className="nt-actions">
                    <Button variant="secondary" onClick={cancelEditUser}>Cancel</Button>
                    <Button variant="primary" onClick={saveEditUser}>Save</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {approvingUserId && (
            <motion.div
              className="approval-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="approval-spinner">
                <Loader size={48} className="spin-icon-lg" />
                <p className="approval-text">Processing approval...</p>
              </div>
            </motion.div>
          )}

          {deleteTarget && (
            <DeleteUserModal
              email={deleteTarget.email}
              onConfirm={confirmDelete}
              onCancel={() => setDeleteTarget(null)}
              isLoading={deleteLoading}
            />
          )}
        </Container>
      </AdminPageShell>
    </DashboardLayout>
  );
}

export default AdminUsersPage;
