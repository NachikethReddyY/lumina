import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Container from '../components/Container';
import { usersApi } from '../utils/apiClient';
import { useCurrentUser } from '../hooks/useCurrentUser';
import './AccountSettingsPage.css';

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="as-field">
      <label className="as-label">{label}</label>
      <div className="as-input-wrap">
        <Lock size={14} className="as-input-icon" />
        <input
          className="as-input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          className="as-show-btn"
          type="button"
          onClick={() => setShow(!show)}
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ff3b30', '#ff9500', '#fbbf24', '#34c759'];

  return (
    <div className="as-strength">
      <div className="as-strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="as-strength-bar"
            style={{ background: i < score ? colors[score - 1] : 'var(--color-hairline)' }}
          />
        ))}
      </div>
      <span className="as-strength-label" style={{ color: colors[score - 1] || '#4b5563' }}>
        {labels[score - 1] || 'Too short'}
      </span>
    </div>
  );
}

export function AccountSettingsPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }

    setStatus('loading');
    try {
      const res = await usersApi.changePassword(currentPassword, newPassword);
      if (res.ok) {
        setStatus('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg((body as { error?: string }).error || 'Failed to update password.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      alert('Email does not match. Please try again.');
      return;
    }

    if (!confirm(`Are you absolutely sure? This will permanently delete your account and cannot be undone.`)) {
      return;
    }

    try {
      const res = await usersApi.delete(user!.id);
      if (res.ok) {
        localStorage.removeItem('authToken');
        navigate('/login', { replace: true });
      } else {
        alert('Failed to delete account. Please try again.');
      }
    } catch {
      alert('Error deleting account. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="as-page">
        <Container maxWidth="sm">
          <motion.div
            className="as-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="as-header">
              <h1 className="as-title">Account Settings</h1>
              <p className="as-subtitle">Manage your password and security preferences.</p>
            </div>

            <div className="as-section">
              <h2 className="as-section-title">Change Password</h2>
              <form className="as-form" onSubmit={handleSubmit}>
                <PasswordInput
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter current password"
                />
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Enter new password"
                />
                {newPassword && <PasswordStrength password={newPassword} />}
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm new password"
                />

                {errorMsg && (
                  <div className="as-error">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </div>
                )}

                {status === 'success' && (
                  <div className="as-success">
                    <CheckCircle2 size={14} />
                    Password updated successfully.
                  </div>
                )}

                <button
                  type="submit"
                  className="as-submit-btn"
                  disabled={status === 'loading' || !currentPassword || !newPassword || !confirmPassword}
                >
                  {status === 'loading' ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="as-section" style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '32px' }}>
              <h2 className="as-section-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                Danger Zone
              </h2>
              <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
                Permanent actions that cannot be undone
              </p>

              {!showDeleteConfirm ? (
                <div style={{ marginTop: '16px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)' }}>
                  <p style={{ margin: '0 0 12px 0', color: '#d1d5db', fontSize: '13px' }}>
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      padding: '10px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={14} />
                    Delete My Account
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '16px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)' }}>
                  <p style={{ margin: '0 0 12px 0', color: '#d1d5db', fontSize: '13px', fontWeight: '600' }}>
                    To confirm deletion, please type your email address:
                  </p>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      background: 'rgba(31, 34, 40, 0.6)',
                      color: '#f7f8f8',
                      fontSize: '13px',
                      marginBottom: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmEmail('');
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmEmail !== user?.email}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: deleteConfirmEmail === user?.email ? '#ef4444' : 'rgba(239, 68, 68, 0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: deleteConfirmEmail === user?.email ? 'pointer' : 'not-allowed',
                        opacity: deleteConfirmEmail === user?.email ? 1 : 0.5,
                      }}
                    >
                      Permanently Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default AccountSettingsPage;
