import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';
import { categoriesApi, ticketsApi, type ApiCategory, type ApiTicket } from '../utils/apiClient';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: ApiTicket) => void;
}

export function CreateTicketModal({ open, onClose, onCreated }: Props) {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    categoryId: '',
    type: 'software' as 'software' | 'bug' | 'incident',
    priority: 'P2' as 'P1' | 'P2' | 'P3' | 'P4',
    replicationSteps: '',
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await categoriesApi.list();
        const body = await res.json().catch(() => []);
        if (cancelled) return;
        const loaded = Array.isArray(body) ? (body as ApiCategory[]) : [];
        setCategories(loaded);
        const active = loaded.find((c) => c.is_active) || loaded[0];
        setNewTicket((prev) => ({
          ...prev,
          categoryId: loaded.some((c) => c.id === prev.categoryId && c.is_active)
            ? prev.categoryId
            : active?.id || '',
        }));
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setFormError('');
    const categoryId = newTicket.categoryId || activeCategories[0]?.id || '';
    if (!categoryId) {
      setFormError('Choose a category before creating a ticket.');
      return;
    }
    setCreating(true);
    try {
      const res = await ticketsApi.create({
        title: newTicket.title,
        description: newTicket.description,
        categoryId,
        type: newTicket.type,
        priority: newTicket.priority,
        replicationSteps: newTicket.replicationSteps || undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorBody = body as { error?: string; details?: Record<string, string> };
        const detail = Object.values(errorBody.details || {})[0];
        setFormError(detail || errorBody.error || 'Could not create ticket.');
        return;
      }
      onCreated(body as ApiTicket);
      setNewTicket({ title: '', description: '', categoryId: activeCategories[0]?.id || '', type: 'software', priority: 'P2', replicationSteps: '' });
      onClose();
    } catch {
      setFormError('Could not create ticket. Check your connection and try again.');
    } finally {
      setCreating(false);
    }
  }, [creating, newTicket, activeCategories, onCreated, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="nt-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="nt-modal"
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="nt-modal-header">
              <h2>New Ticket</h2>
              <div className="nt-modal-header-right">
                <span className="nt-shortcut-hint">⌘N</span>
                <button className="nt-close-btn" onClick={onClose}><X size={16} /></button>
              </div>
            </div>
            {formError && <p className="nt-error">{formError}</p>}
            <form onSubmit={handleSubmit} className="nt-form">
              <div className="nt-field"><label>Title *</label><input value={newTicket.title} onChange={(e) => setNewTicket((p) => ({ ...p, title: e.target.value }))} required placeholder="Brief description of the issue" /></div>
              <div className="nt-field"><label>Description *</label><textarea rows={4} value={newTicket.description} onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))} required placeholder="Provide full context…" /></div>
              <div className="nt-row">
                <div className="nt-field">
                  <label>Category</label>
                  <select value={newTicket.categoryId} onChange={(e) => setNewTicket((p) => ({ ...p, categoryId: e.target.value }))}>
                    {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="nt-field">
                  <label>Type</label>
                  <select value={newTicket.type} onChange={(e) => setNewTicket((p) => ({ ...p, type: e.target.value as 'software' | 'bug' | 'incident' }))}>
                    <option value="software">Software</option>
                    <option value="bug">Bug</option>
                    <option value="incident">Incident</option>
                  </select>
                </div>
                <div className="nt-field">
                  <label>Priority</label>
                  <select value={newTicket.priority} onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value as 'P1' | 'P2' | 'P3' | 'P4' }))}>
                    <option value="P1">P1 — Critical</option>
                    <option value="P2">P2 — High</option>
                    <option value="P3">P3 — Medium</option>
                    <option value="P4">P4 — Low</option>
                  </select>
                </div>
              </div>
              <div className="nt-field">
                <label>Replication Steps</label>
                <textarea rows={3} value={newTicket.replicationSteps} onChange={(e) => setNewTicket((p) => ({ ...p, replicationSteps: e.target.value }))} placeholder="Optional — steps to reproduce" />
              </div>
              <div className="nt-actions">
                <Button variant="secondary" type="button" onClick={onClose} disabled={creating}>Cancel</Button>
                <Button variant="primary" type="submit" loading={creating} disabled={!activeCategories.length}>Create Ticket</Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CreateTicketModal;
