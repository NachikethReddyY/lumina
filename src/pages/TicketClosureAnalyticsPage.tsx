import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketClosureAnalyticsChart, { ClosureAnalyticsData } from '../components/charts/TicketClosureAnalyticsChart';
import { ChartSkeleton } from '../components/charts/chartConstants';
import { reportsApi } from '../utils/apiClient';
import '../pages/TicketHistoryPage.css';

export function TicketClosureAnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ClosureAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await reportsApi.ticketClosureAnalytics();
        const jsonData = await response.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load analytics';
        setError(message);
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (!loading && error) {
    return (
      <div className="ticket-history-container">
        <div className="history-header">
          <h1>HR Analytics Dashboard</h1>
        </div>
        <div style={{ padding: '20px', color: '#ef4444', textAlign: 'center' }}>
          <p>Error loading analytics: {error}</p>
          <button
            onClick={() => navigate('/tickets')}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-history-container">
      <div className="history-header">
        <h1>HR Analytics Dashboard</h1>
        <p style={{ color: '#9ca3af', marginTop: '8px' }}>
          Monitor team performance, workload distribution, and operational health. Track individual productivity, burnout risk, and process bottlenecks.
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPeriod('7d')}
            style={{
              padding: '6px 12px',
              background: period === '7d' ? '#3b82f6' : '#e5e7eb',
              color: period === '7d' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            7 Days
          </button>
          <button
            onClick={() => setPeriod('30d')}
            style={{
              padding: '6px 12px',
              background: period === '30d' ? '#3b82f6' : '#e5e7eb',
              color: period === '30d' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            30 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton height={250} />
        </div>
      ) : data ? (
        <>
          <TicketClosureAnalyticsChart {...data} />

          <div style={{ marginTop: '32px', padding: '24px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '18px', fontWeight: 600 }}>
              Key Performance Indicators
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'white', borderRadius: '6px', borderLeft: '3px solid #16a34a' }}>
                <p style={{ margin: '0 0 6px 0', color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>Total Resolved</p>
                <p style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: 700 }}>
                  {data.monthlyAverage.reduce((sum, m) => sum + m.count, 0)}
                </p>
              </div>
              <div style={{ padding: '16px', background: 'white', borderRadius: '6px', borderLeft: '3px solid #8b5cf6' }}>
                <p style={{ margin: '0 0 6px 0', color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>Avg Resolution</p>
                <p style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: 700 }}>
                  {(data.monthlyAverage.reduce((sum, m) => sum + m.avgHours, 0) / (data.monthlyAverage.length || 1)).toFixed(1)}h
                </p>
              </div>
              <div style={{ padding: '16px', background: 'white', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                <p style={{ margin: '0 0 6px 0', color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>Common Range</p>
                <p style={{ margin: 0, color: '#1f2937', fontSize: '20px', fontWeight: 700 }}>
                  {data.closureDistribution[0]?.range || 'N/A'}
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '12px' }}>
                  {data.closureDistribution[0]?.percentage}% of tickets
                </p>
              </div>
              <div style={{ padding: '16px', background: 'white', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                <p style={{ margin: '0 0 6px 0', color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>P1 Closure Target</p>
                <p style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: 700 }}>
                  {data.priorityAnalysis.find(p => p.priority === 'P1')?.avgHours || 'N/A'}h
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
            <p style={{ margin: 0, color: '#166534', fontSize: '13px', lineHeight: '1.6' }}>
              <strong>📊 Dashboard Overview:</strong> This dashboard aggregates ticket closure patterns, team performance metrics, and operational efficiency indicators. Use the KPIs above to identify trends, monitor team health, and detect potential bottlenecks or overload conditions.
            </p>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '13px', lineHeight: '1.6' }}>
              <strong>💡 How to Use:</strong> Compare monthly trends to spot performance changes. Monitor the most common closure range for your baseline. Use priority-based metrics to ensure SLA compliance. Track team utilization via resolution rates and active ticket counts.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default TicketClosureAnalyticsPage;
