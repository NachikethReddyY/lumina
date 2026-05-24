import { useEffect, useState } from 'react';
import { usersApi } from '../utils/apiClient';
import { apiAssetUrl } from '../utils/apiBase';

type UserSummary = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  job_title?: string | null;
  department?: string | null;
  open_ticket_count: number;
  recently_resolved_count: number;
};

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default function UserProfileCard({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await usersApi.summary(userId);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) setError((body as { error?: string }).error || 'Failed to load user info');
          return;
        }
        const body = (await res.json()) as UserSummary;
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setError('Failed to load user info');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const fullName = data ? `${data.first_name} ${data.last_name}`.trim() : '';

  return (
    <div className="upc-overlay" onClick={onClose}>
      <div className="upc-card" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="upc-loading">Loading...</div>
        ) : error ? (
          <div className="upc-error">{error}</div>
        ) : data ? (
          <>
            <div className="upc-header">
              <div className="upc-avatar">
                {data.avatar_url ? (
                  <img src={apiAssetUrl(data.avatar_url)} alt="" />
                ) : (
                  <span>{initials(fullName)}</span>
                )}
              </div>
              <div className="upc-info">
                <strong className="upc-name">{fullName}</strong>
                {data.email && <span className="upc-email">{data.email}</span>}
              </div>
            </div>
            <div className="upc-body">
              {data.job_title && (
                <div className="upc-row">
                  <span className="upc-label">Job Title</span>
                  <span>{data.job_title}</span>
                </div>
              )}
              {data.department && (
                <div className="upc-row">
                  <span className="upc-label">Department</span>
                  <span>{data.department}</span>
                </div>
              )}
              <div className="upc-stats">
                <div className="upc-stat">
                  <span className="upc-stat-value">{data.open_ticket_count}</span>
                  <span className="upc-stat-label">Open tickets</span>
                </div>
                <div className="upc-stat">
                  <span className="upc-stat-value">{data.recently_resolved_count}</span>
                  <span className="upc-stat-label">Recently resolved</span>
                </div>
              </div>
            </div>
            <a href="/profile" className="upc-profile-link">View full profile</a>
          </>
        ) : null}
      </div>
      <style>{`
        .upc-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.5);
        }
        .upc-card {
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px;
          min-width: 280px;
          max-width: 340px;
          color: #e0e0e0;
          font-size: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .upc-loading, .upc-error {
          padding: 24px;
          text-align: center;
          color: #999;
        }
        .upc-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .upc-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          color: #ccc;
        }
        .upc-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .upc-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .upc-name {
          font-size: 15px;
          color: #fff;
        }
        .upc-email {
          font-size: 12px;
          color: #999;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .upc-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .upc-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .upc-label {
          color: #888;
        }
        .upc-stats {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .upc-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }
        .upc-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
        }
        .upc-stat-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .upc-profile-link {
          display: block;
          text-align: center;
          padding: 8px;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          color: #7aa2f7;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }
        .upc-profile-link:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}
