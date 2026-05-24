import { Circle, RotateCcw } from 'lucide-react';
import type { ApiTicket, ApiComment, ApiUser } from '../../utils/apiClient';
import { TicketCommentsPanel } from './TicketCommentsPanel';

const PRIORITY_COLOR: Record<string, string> = {
  P1: '#cf2d56',
  P2: '#2563eb',
  P3: '#1f8a65',
  P4: '#807d72',
};

const STATUS_COLOR: Record<string, string> = {
  open: '#807d72',
  assigned: '#2563eb',
  in_progress: '#1f8a65',
  resolved: '#1f8a65',
  closed: '#a09c92',
  on_hold: '#c08532',
  pending_routing: '#dfa88f',
};

function humanize(value?: string | null): string {
  if (!value) return '';
  return value.replace(/_/g, ' ');
}

function ticketCode(ticket: ApiTicket): string {
  return `LM-${ticket.id.slice(0, 3).toUpperCase()}`;
}

export type TicketDetailPanelProps = {
  ticket: ApiTicket | null;
  user: ApiUser | null;
  canReroute: boolean;
  reroutingTicket: boolean;
  canEditDetails: boolean;
  canComment: boolean;
  canSendToQa: boolean;
  canMutate: boolean;
  isQaUser: boolean;
  editingTitle: boolean;
  editingDesc: boolean;
  editTitleValue: string;
  editDescValue: string;
  savingDetails: boolean;
  comments: ApiComment[];
  commentsLoading: boolean;
  commentDraft: string;
  commentSending: boolean;
  onReroute: () => void;
  onSendToQa: () => void;
  onQaVerify: () => void;
  onCloseTicket: () => void;
  onEditTitleStart: () => void;
  onEditDescStart: () => void;
  onEditTitleChange: (value: string) => void;
  onEditDescChange: (value: string) => void;
  onSaveDetails: () => void;
  onCancelEditDesc: () => void;
  onDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  onAvatarClick: (userId: string) => void;
};

export function TicketDetailPanel({
  ticket,
  user,
  canReroute,
  reroutingTicket,
  canEditDetails,
  canComment,
  canSendToQa,
  canMutate,
  isQaUser,
  editingTitle,
  editingDesc,
  editTitleValue,
  editDescValue,
  savingDetails,
  comments,
  commentsLoading,
  commentDraft,
  commentSending,
  onReroute,
  onSendToQa,
  onQaVerify,
  onCloseTicket,
  onEditTitleStart,
  onEditDescStart,
  onEditTitleChange,
  onEditDescChange,
  onSaveDetails,
  onCancelEditDesc,
  onDraftChange,
  onSubmitComment,
  onAvatarClick,
}: TicketDetailPanelProps) {
  if (!ticket) {
    return (
      <div className="th-empty-main">
        <Circle size={32} />
        <h3>No ticket selected</h3>
        <p>Choose a ticket from the left column.</p>
      </div>
    );
  }

  return (
    <>
      <div className="th-detail-kicker">
        <span className="th-priority-pill large" style={{ color: PRIORITY_COLOR[ticket.priority], background: `${PRIORITY_COLOR[ticket.priority]}14` }}>
          {ticket.priority}
        </span>
        <span className="th-ticket-id">{ticketCode(ticket)}</span>
        <span className="th-detail-status" style={{ background: `${STATUS_COLOR[ticket.status]}22`, color: STATUS_COLOR[ticket.status] }}>
          {humanize(ticket.status)}
        </span>
      </div>

      <div className="th-detail-title-row">
        {editingTitle ? (
          <input
            className="th-edit-input"
            value={editTitleValue}
            onChange={(e) => onEditTitleChange(e.target.value)}
            placeholder="Ticket title"
          />
        ) : (
          <h2
            onClick={() => { if (canEditDetails) onEditTitleStart(); }}
            style={canEditDetails ? { cursor: 'pointer' } : undefined}
          >
            {ticket.title}
          </h2>
        )}
        <div className="th-detail-actions">
          <button
            type="button"
            className="th-ticket-reroute"
            onClick={onReroute}
            disabled={!canReroute || reroutingTicket}
          >
            <RotateCcw size={15} />
            {reroutingTicket ? 'Rerouting' : 'Reroute'}
          </button>
          {canSendToQa && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <button type="button" className="th-ticket-qa-btn" onClick={onSendToQa}>
              Send to QA
            </button>
          )}
          {isQaUser && canMutate && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <button type="button" className="th-ticket-verify-btn" onClick={onQaVerify}>
              Mark verified
            </button>
          )}
          {ticket.status === 'resolved' && canMutate && (
            <button type="button" className="th-ticket-close-btn" onClick={onCloseTicket}>
              Close ticket
            </button>
          )}
        </div>
      </div>

      {editingDesc ? (
        <div className="th-edit-description-wrap">
          <textarea
            className="th-edit-textarea"
            value={editDescValue}
            onChange={(e) => onEditDescChange(e.target.value)}
            placeholder="Description"
            rows={4}
          />
          <div className="th-edit-actions">
            <button type="button" className="th-edit-save" onClick={onSaveDetails} disabled={savingDetails}>
              {savingDetails ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="th-edit-cancel" onClick={onCancelEditDesc}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className="th-detail-description"
          onClick={() => { if (canEditDetails) onEditDescStart(); }}
          style={canEditDetails ? { cursor: 'pointer' } : undefined}
        >
          {ticket.description}
        </p>
      )}

      <div className="th-detail-panels">
        <TicketCommentsPanel
          user={user}
          comments={comments}
          loading={commentsLoading}
          canComment={canComment}
          commentDraft={commentDraft}
          commentSending={commentSending}
          onDraftChange={onDraftChange}
          onSubmit={onSubmitComment}
          onAvatarClick={onAvatarClick}
        />
      </div>
    </>
  );
}

export default TicketDetailPanel;
