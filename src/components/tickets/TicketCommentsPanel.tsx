import { Send, MessageSquare, Trash2 } from 'lucide-react';
import type { ApiComment, ApiUser } from '../../utils/apiClient';
import { apiAssetUrl } from '../../utils/apiBase';
import { canDeleteComment } from '../../utils/orgRoles';

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function commentAuthorName(comment: ApiComment): string {
  return `${comment.first_name || ''} ${comment.last_name || ''}`.trim() || comment.email;
}

export type TicketCommentsPanelProps = {
  user: ApiUser | null;
  comments: ApiComment[];
  loading: boolean;
  canComment: boolean;
  commentDraft: string;
  commentSending: boolean;
  commentDeletingId?: string | null;
  onDraftChange: (v: string) => void;
  onSubmit: () => void;
  onDelete?: (commentId: string) => void;
  onAvatarClick?: (userId: string) => void;
};

export function TicketCommentsPanel({
  user,
  comments,
  loading,
  canComment,
  commentDraft,
  commentSending,
  commentDeletingId = null,
  onDraftChange,
  onSubmit,
  onDelete,
  onAvatarClick,
}: TicketCommentsPanelProps) {
  const activeCount = comments.filter((c) => !c.is_deleted).length;

  return (
    <section className="th-section-card th-comments-card">
      <header>
        <span><MessageSquare size={16} /> Comments</span>
        <small>{comments.length} total · {activeCount} visible</small>
      </header>

      {canComment && (
        <div className="th-comment-compose">
          <span className="th-comment-avatar">
            {user?.avatar_url ? <img src={apiAssetUrl(user.avatar_url)} alt="" /> : initials(`${user?.first_name || ''} ${user?.last_name || ''}`)}
          </span>
          <div className="th-comment-compose-body">
            <textarea
              value={commentDraft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Add a comment visible to the organization"
              rows={3}
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={commentSending || !commentDraft.trim()}
            >
              <Send size={14} />
              {commentSending ? 'Adding' : 'Comment'}
            </button>
          </div>
        </div>
      )}

      <div className="th-comment-thread">
        {loading && !comments.length ? (
          <div className="th-comment-empty">Loading comments...</div>
        ) : comments.length ? (
          comments.map((comment) => {
            const deleted = Boolean(comment.is_deleted);
            const displayBody = deleted
              ? (comment.tombstone_message || 'This comment was deleted.')
              : comment.body;
            const mayDelete = user && onDelete && canDeleteComment(user, comment);

            return (
              <article
                className={`th-comment-item${deleted ? ' th-comment-item--deleted' : ''}`}
                key={comment.id}
              >
                {onAvatarClick ? (
                  <button
                    type="button"
                    className="th-comment-avatar"
                    onClick={() => onAvatarClick(comment.author_id)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    {comment.avatar_url ? <img src={apiAssetUrl(comment.avatar_url)} alt="" /> : initials(commentAuthorName(comment))}
                  </button>
                ) : (
                  <span className="th-comment-avatar">
                    {comment.avatar_url ? <img src={apiAssetUrl(comment.avatar_url)} alt="" /> : initials(commentAuthorName(comment))}
                  </span>
                )}
                <div className="th-comment-content">
                  <div className="th-comment-meta">
                    <strong>{commentAuthorName(comment)}</strong>
                    <span>{timeAgo(comment.created_at)}</span>
                    {mayDelete && (
                      <button
                        type="button"
                        className="th-comment-delete"
                        onClick={() => onDelete(comment.id)}
                        disabled={commentDeletingId === comment.id}
                        title={comment.author_id === user?.id ? 'Delete your comment' : 'Remove comment (admin)'}
                      >
                        <Trash2 size={13} />
                        {commentDeletingId === comment.id ? 'Removing…' : 'Delete'}
                      </button>
                    )}
                  </div>
                  <p className={deleted ? 'th-comment-tombstone' : undefined}>{displayBody}</p>
                </div>
              </article>
            );
          })
        ) : (
          <div className="th-comment-empty">No comments yet.</div>
        )}
      </div>
    </section>
  );
}

export default TicketCommentsPanel;
