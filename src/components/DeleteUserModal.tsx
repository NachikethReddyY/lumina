import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import Button from './Button';
import './DeleteUserModal.css';

interface DeleteUserModalProps {
  email: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Confirms permanent user deletion.
 * Uses shared light-theme tokens (no dark gradients) so it matches the admin dashboard.
 */
export function DeleteUserModal({ email, onConfirm, onCancel, isLoading = false }: DeleteUserModalProps) {
  return (
    <motion.div
      className="delete-user-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onCancel}
    >
      <motion.div
        className="delete-user-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        role="alertdialog"
        aria-labelledby="delete-user-title"
        aria-describedby="delete-user-desc"
      >
        <div className="delete-user-header">
          <div className="delete-user-title-row">
            <Trash2 size={20} style={{ color: '#dc2626' }} aria-hidden />
            <h2 id="delete-user-title">Delete User</h2>
          </div>
          <button type="button" className="delete-user-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="delete-user-body">
          <p id="delete-user-desc" className="delete-user-lead">
            You are about to permanently delete this user account:
          </p>

          <div className="delete-user-email">{email}</div>

          <p className="delete-user-warning">
            This action <strong>cannot be undone</strong>. All associated data will be permanently removed.
          </p>

          <div className="delete-user-actions">
            <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isLoading}
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
            >
              {isLoading ? 'Deleting…' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DeleteUserModal;
