import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { CHART_GRID, CHART_MARGIN, CHART_TICK } from './chartConstants';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: '8px' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: '#f7f8f8', fontSize: '14px', fontWeight: 600, margin: 0 }}>{payload[0].value}</p>
    </div>
  );
};

export type UserDashboardChartsProps = {
  dailyLine: { date: string; count: number }[];
  statusBar: { status: string; count: number; fill: string }[];
  priorityBar: { priority: string; count: number; fill: string }[];
};

export function UserDashboardCharts({ dailyLine, statusBar, priorityBar }: UserDashboardChartsProps) {
  return (
    <motion.div className="charts-grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <motion.div className="chart-card">
        <h4 className="chart-card-title">Tickets Created (Last 14 Days)</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={dailyLine} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="date" tick={CHART_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div className="chart-card">
        <h4 className="chart-card-title">Tickets by Status</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={statusBar} margin={{ ...CHART_MARGIN, left: 18, right: 12, bottom: 8 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="status" tick={CHART_TICK} tickLine={false} axisLine={false} />
            <YAxis
              width={58}
              tick={CHART_TICK}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              label={{ value: 'Tickets', angle: -90, position: 'insideLeft', offset: 2, fill: '#374151', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} minPointSize={4}>
              {statusBar.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div className="chart-card">
        <h4 className="chart-card-title">Tickets by Priority</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={priorityBar} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="priority" tick={CHART_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {priorityBar.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}

export default UserDashboardCharts;
