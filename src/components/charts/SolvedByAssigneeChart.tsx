import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend,
} from 'recharts';
import type { SolvedByAssignee } from '../../utils/apiClient';

const SOLVED_COLORS = ['#2563eb', '#8b5cf6', '#d97706', '#1f8a65', '#dc2626', '#0891b2', '#ca8a04'];

const PERIOD_LABELS: Record<string, string> = {
  '7d': 'This week',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

type Props = {
  data: SolvedByAssignee[];
  period: string;
  loading: boolean;
  onPeriodChange: (period: string) => void;
  chipClassName?: string;
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p>{label}</p>
      {payload.map((p) => (
        <strong key={p.name} style={{ color: p.color || undefined }}>{p.name}: {p.value}</strong>
      ))}
    </div>
  );
}

export function SolvedByAssigneeChart({ data, period, loading, onPeriodChange, chipClassName = 'sa-filter-chip' }: Props) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const chartRows = data.slice(0, 12);

  return (
    <>
      <div className="chart-card chart-card--full-width">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h4 className="chart-card-title">Most Tickets Solved</h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
              {PERIOD_LABELS[period] || period} · includes takeovers · click chart for full list
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`${chipClassName} ${period === p ? 'active' : ''}`}
                onClick={() => onPeriodChange(p)}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Loading...</div>
        ) : data.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>No data for this period</div>
        ) : (
          <button
            type="button"
            className="sa-chart-clickable"
            onClick={() => setShowLeaderboard(true)}
            aria-label="Open full leaderboard"
          >
            <ResponsiveContainer width="100%" height={Math.max(280, chartRows.length * 36)}>
              <BarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline-soft)" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="count" name="Solved" stackId="work" fill="#2563eb" radius={[0, 0, 0, 0]} />
                <Bar dataKey="takeovers" name="Takeovers" stackId="work" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {chartRows.map((_, i) => (
                    <Cell key={`takeover-${i}`} fill={SOLVED_COLORS[(i + 2) % SOLVED_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </button>
        )}
      </div>

      {showLeaderboard && (
        <div className="nt-modal-overlay" role="presentation" onClick={() => setShowLeaderboard(false)}>
          <div className="nt-modal sa-leaderboard-modal" role="dialog" aria-labelledby="leaderboard-title" onClick={(e) => e.stopPropagation()}>
            <div className="nt-modal-header">
              <div>
                <h2 id="leaderboard-title">Ticket closers — {PERIOD_LABELS[period] || period}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {data.length} team members · solved tickets and takeovers
                </p>
              </div>
              <button type="button" className="nt-close-btn" onClick={() => setShowLeaderboard(false)}>✕</button>
            </div>
            <div className="sa-leaderboard-table-wrap">
              <table className="ticket-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Solved</th>
                    <th>Takeovers</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={`${row.name}-${row.department}`} className="ticket-table-row">
                      <td className="tbl-muted">{index + 1}</td>
                      <td><strong>{row.name}</strong></td>
                      <td className="tbl-muted">{row.department || '—'}</td>
                      <td>{row.count}</td>
                      <td>{row.takeovers ?? 0}</td>
                      <td><strong>{row.count + (row.takeovers ?? 0)}</strong></td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No activity in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
