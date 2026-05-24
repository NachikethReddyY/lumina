import { Send, MessageSquare } from 'lucide-react';
import type { ApiComment, ApiUser } from '../../utils/apiClient';
import { apiAssetUrl } from '../../utils/apiBase';

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
  onDraftChange: (v: string) => void;
  onSubmit: () => void;
  onAvatarClick?: (userId: string) => void;
};

export function TicketCommentsPanel({
  user,
  comments,
  loading,
  canComment,
  commentDraft,
  commentSending,
  onDraftChange,
  onSubmit,
  onAvatarClick,
}: TicketCommentsPanelProps) {
  return (
    <section className="th-section-card th-comments-card">
      <header>
        <span><MessageSquare size={16} /> Comments</span>
        <small>{comments.length} notes</small>
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
              placeholder="Add a comment"
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
          comments.map((comment) => (
            <article className="th-comment-item" key={comment.id}>
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
              <div>
                <div className="th-comment-meta">
                  <strong>{commentAuthorName(comment)}</strong>
                  <span>{timeAgo(comment.created_at)}</span>
                </div>
                <p>{comment.body}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="th-comment-empty">No comments yet.</div>
        )}
      </div>
    </section>
  );
}

export default TicketCommentsPanel;
