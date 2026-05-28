import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { AdminWorkload, ApiTicket, ApiUser } from '../../utils/apiClient';
import {
  getDepartmentGroupLabel,
  getUserDepartmentGroup,
} from '../../utils/userDisplay';

export const PRIORITY_COLOR: Record<string, string> = { P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280' };

export const STATUS_COLOR_MAP: Record<string, string> = {
  open: '#60a5fa',
  assigned: '#818cf8',
  'in progress': '#fbbf24',
  'on hold': '#f97316',
  'pending routing': '#a78bfa',
  resolved: '#34c759',
  closed: '#16a34a',
};

export const STATUS_PIE_ORDER = ['abandoned', 'resolved', 'in progress', 'assigned', 'to do', 'on hold', 'pending routing'];

export function formatStatusLabel(status: string) {
  const normalized = status.replace(/_/g, ' ');
  if (normalized === 'open') return 'To Do';
  if (normalized === 'closed') return 'Abandoned';
  return normalized;
}

export const USER_STATUS_COLORS: Record<ApiUser['status'], string> = {
  active: '#2563eb',
  pending: '#d97706',
  suspended: '#dc2626',
};

export const DEPT_CHART_COLORS: Record<string, string> = {
  Developers: '#2563eb',
  QA: '#8b5cf6',
  Managers: '#d97706',
  HR: '#1f8a65',
  Unknown: '#6b7280',
};

export function buildStatusPie(tickets: ApiTicket[]) {
  const map: Record<string, number> = {};
  tickets.forEach((t) => { map[t.status] = (map[t.status] || 0) + 1; });
  const entries = Object.entries(map).map(([status, value]) => ({
    name: formatStatusLabel(status),
    value,
    fill: STATUS_COLOR_MAP[status.replace(/_/g, ' ')] || '#6b7280',
  }));
  return entries.sort((a, b) => {
    const ai = STATUS_PIE_ORDER.indexOf(a.name.toLowerCase());
    const bi = STATUS_PIE_ORDER.indexOf(b.name.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function buildMonthlyLine(tickets: ApiTicket[]) {
  const months: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
  }
  tickets.forEach((t) => {
    const label = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short' });
    if (label in months) months[label]++;
  });
  return Object.entries(months).map(([month, count]) => ({ month, count }));
}

export function buildPeopleByDepartmentGroup(users: ApiUser[]) {
  const groups = ['manager', 'developer', 'qa'] as const;
  return groups.map((group) => {
    const scoped = users.filter((user) => getUserDepartmentGroup(user) === group);
    return {
      role: getDepartmentGroupLabel(group),
      active: scoped.filter((user) => user.status === 'active').length,
      pending: scoped.filter((user) => user.status === 'pending').length,
      suspended: scoped.filter((user) => user.status === 'suspended').length,
    };
  });
}

export function buildHeadcountByDepartment(users: ApiUser[]) {
  const counts: Record<string, number> = {};
  users.forEach((user) => {
    const dept = user.department?.trim() || 'Unknown';
    counts[dept] = (counts[dept] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    fill: DEPT_CHART_COLORS[name] || DEPT_CHART_COLORS.Unknown,
  }));
}

export function buildTicketsByDepartment(tickets: ApiTicket[], users: ApiUser[]) {
  const byEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const counts: Record<'HR' | 'Developers' | 'QAs' | 'Managers', number> = {
    HR: 0,
    Developers: 0,
    QAs: 0,
    Managers: 0,
  };

  const normalizeDepartment = (department?: string | null): keyof typeof counts | null => {
    const dept = (department || '').trim().toLowerCase();
    if (dept === 'hr') return 'HR';
    if (dept === 'developers') return 'Developers';
    if (dept === 'qa') return 'QAs';
    if (dept === 'managers') return 'Managers';
    return null;
  };

  tickets.forEach((ticket) => {
    const submitter = byEmail.get((ticket.submitted_by_email || '').toLowerCase());
    const dept = normalizeDepartment(submitter?.department);
    if (dept) counts[dept] += 1;
  });
  return [
    { name: 'HR', value: counts.HR, fill: DEPT_CHART_COLORS.HR },
    { name: 'Developers', value: counts.Developers, fill: DEPT_CHART_COLORS.Developers },
    { name: 'QAs', value: counts.QAs, fill: DEPT_CHART_COLORS.QA },
    { name: 'Managers', value: counts.Managers, fill: DEPT_CHART_COLORS.Managers },
  ];
}

export function buildTicketProgressSummary(tickets: ApiTicket[]) {
  const active = tickets.filter((t) =>
    ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)
  ).length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const resolved = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const pendingRouting = tickets.filter((t) => t.status === 'pending_routing').length;
  return { active, inProgress, resolved, pendingRouting, total: tickets.length };
}

export function buildAdminPriorityLoad(workload: AdminWorkload[]) {
  return workload
    .map((admin) => ({
      name: `${admin.first_name} ${admin.last_name}`.trim() || admin.email,
      detail: [admin.job_title?.trim(), admin.department?.trim()].filter(Boolean).join(' · ') || admin.email,
      P1: admin.p1_count,
      P2: admin.p2_count,
      P3: admin.p3_count,
      P4: admin.p4_count,
      score: admin.load_score,
    }))
    .filter((admin) => (admin.P1 + admin.P2 + admin.P3 + admin.P4) > 0);
}

export function luminaVoice(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/Gemini AI/gi, 'Lumina AI')
    .replace(/Gemini fallback was used because:\s*/gi, 'Lumina AI used fallback routing because ')
    .replace(/Gemini routing request failed \(429\)/gi, 'the routing model was rate limited (429)')
    .replace(/Gemini routing request failed \((\d+)\)/gi, 'the routing model request failed ($1)')
    .replace(/\bGemini\b/gi, 'Lumina AI');
}

export function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; payload?: { detail?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const detail = payload[0]?.payload?.detail;
  return (
    <div className="chart-tooltip">
      <p>{label}</p>
      {detail ? <p style={{ marginTop: '-2px', opacity: 0.8 }}>{detail}</p> : null}
      {payload.map((p) => (
        <strong key={p.name} style={{ color: p.color || undefined }}>{p.name}: {p.value}</strong>
      ))}
    </div>
  );
}

export function AdminPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.div
      className="dashboard-header"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="header-content">
        <div>
          <h1 className="dashboard-title">{title}</h1>
          {subtitle ? <p className="dashboard-subtitle">{subtitle}</p> : null}
        </div>
      </div>
    </motion.div>
  );
}

export function AdminPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-content super-admin-content">
      {children}
    </div>
  );
}
