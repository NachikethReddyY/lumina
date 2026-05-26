import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, Cell, ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { CHART_GRID, CHART_MARGIN, CHART_TICK } from './chartConstants';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number | string; name: string; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: '8px' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 4px' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || '#f7f8f8', fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export type ClosureAnalyticsData = {
  monthlyAverage: { month: string; avgHours: number; count: number }[];
  closureDistribution: { range: string; count: number; percentage: number }[];
  priorityAnalysis: { priority: string; avgHours: number; fill: string }[];
  ticketTimeline: { name: string; hours: number; priority: string; month: string; fill: string }[];
};

export function TicketClosureAnalyticsChart({
  monthlyAverage,
  closureDistribution,
  priorityAnalysis,
  ticketTimeline,
}: ClosureAnalyticsData) {
  return (
    <motion.div className="charts-grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      {/* Average Closure Time by Month */}
      <motion.div className="chart-card">
        <h4 className="chart-card-title">Avg. Ticket Closure Time (Hours)</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthlyAverage} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="month" tick={CHART_TICK} tickLine={false} axisLine={false} angle={-45} height={60} />
            <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="avgHours"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6, fill: '#34d399' }}
              name="Avg Hours"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Closure Time Distribution */}
      <motion.div className="chart-card">
        <h4 className="chart-card-title">Closure Time Distribution</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={closureDistribution} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="range" tick={CHART_TICK} tickLine={false} axisLine={false} angle={-45} height={60} />
            <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Ticket Count" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Closure Time by Priority */}
      <motion.div className="chart-card">
        <h4 className="chart-card-title">Avg. Closure Time by Priority</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={priorityAnalysis} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="priority" tick={CHART_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgHours" radius={[4, 4, 0, 0]} name="Avg Hours">
              {priorityAnalysis.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Ticket Timeline Scatter (Closure Time vs Ticket) */}
      <motion.div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h4 className="chart-card-title">Closure Time Scatter (Tickets)</h4>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ ...CHART_MARGIN, bottom: 30, left: 30 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="name" type="number" tick={CHART_TICK} tickLine={false} axisLine={false} label={{ value: 'Ticket Index', position: 'bottom', offset: 10 }} />
            <YAxis dataKey="hours" tick={CHART_TICK} tickLine={false} axisLine={false} label={{ value: 'Closure Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {['P1', 'P2', 'P3', 'P4'].map((priority, idx) => {
              const colors = ['#ef4444', '#f97316', '#eab308', '#6b7280'];
              return (
                <Scatter
                  key={priority}
                  name={`Priority ${priority}`}
                  data={ticketTimeline.filter(t => t.priority === priority)}
                  fill={colors[idx]}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}

export default TicketClosureAnalyticsChart;
