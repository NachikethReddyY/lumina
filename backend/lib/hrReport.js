const db = require('../db');
const { getLuminaApiKey, getLuminaProvider, getLuminaModel, requestLuminaPlainText } = require('./ticketRouting');

// HR report generator used by POST /reports/hr-generate. It pulls users,
// tickets, assignments, and audit history, computes performance/diagnostic
// metrics, and returns an HTML report the frontend can display or download.
const DEPT_COLORS = {
  Developers: '#2563eb',
  QA: '#8b5cf6',
  HR: '#1f8a65',
  Unknown: '#a3a3a3',
};

const LUMINA_LOGO_SVG = `<svg class="brand-logo" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="hr-lumina-grad" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF8A5B"/>
      <stop offset="34%" stop-color="#FF7AAE"/>
      <stop offset="68%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#A78BFA"/>
    </linearGradient>
  </defs>
  <path d="M64 0Q64 64 128 64Q64 64 64 128Q64 64 0 64Q64 64 64 0Z" fill="url(#hr-lumina-grad)"/>
</svg>`;

const DEPT_ORDER = ['Developers', 'QA', 'HR', 'Unknown'];
const CHART_DEPTS = ['Developers', 'QA'];
const SUPPORT_DEPTS = new Set(['Developers', 'QA']);

function isSystemAccount(name) {
  const nameLower = name.toLowerCase();
  return nameLower.includes('lumina') || nameLower.includes('system') || nameLower.includes('bot') || nameLower.includes('ai');
}

function deptSortKey(dept) {
  const idx = DEPT_ORDER.indexOf(dept);
  return idx === -1 ? DEPT_ORDER.length : idx;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getPreviousPeriodRange(periodMeta) {
  const { periodType, start, end } = periodMeta;
  if (periodType === 'week') {
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - 7);
    return { start: prevStart, end: prevEnd };
  }
  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
  prevStart.setHours(0, 0, 0, 0);
  return { start: prevStart, end: prevEnd };
}

function kpiDeltaSuffix(periodMeta) {
  return periodMeta.periodType === 'week' ? 'vs last week' : 'vs last month';
}

function buildKpiDelta(current, previous, { higherIsBetter, suffix, format = 'percent' }) {
  if (previous === null || previous === undefined) {
    return { text: '', className: 'kpi-delta--neutral' };
  }
  const diff = current - previous;
  if (diff === 0) {
    return { text: '→ unchanged', className: 'kpi-delta--neutral' };
  }
  const className = higherIsBetter
    ? diff > 0
      ? 'kpi-delta--positive'
      : 'kpi-delta--negative'
    : diff < 0
      ? 'kpi-delta--positive'
      : 'kpi-delta--negative';
  const arrow = diff > 0 ? '↑' : '↓';
  let text;
  if (format === 'count') {
    text = `${arrow} ${Math.abs(diff)} ${suffix}`;
  } else if (previous === 0) {
    text = `${arrow} ${Math.abs(diff)} ${suffix}`;
  } else {
    const pct = Math.round((Math.abs(diff) / previous) * 100);
    text = `${arrow} ${pct}% ${suffix}`;
  }
  return { text, className };
}

function buildKpiDeltas(current, previous, periodMeta) {
  const suffix = kpiDeltaSuffix(periodMeta);
  return {
    closed: buildKpiDelta(current.resolved, previous.resolved, { higherIsBetter: true, suffix }),
    active: { text: '', className: 'kpi-delta--neutral' },
    avgResolution: buildKpiDelta(
      Math.round(current.avgTimeToResolveHours),
      Math.round(previous.avgTimeToResolveHours),
      { higherIsBetter: false, suffix }
    ),
    teamSize: buildKpiDelta(current.teamSize, previous.teamSize, {
      higherIsBetter: true,
      suffix,
      format: 'count',
    }),
    overload: buildKpiDelta(current.overloadCount, previous.overloadCount, {
      higherIsBetter: false,
      suffix,
      format: 'count',
    }),
    reroutes: buildKpiDelta(current.rerouteCount, previous.rerouteCount, {
      higherIsBetter: false,
      suffix,
      format: 'count',
    }),
  };
}

function computePeriodKpis(tickets, users, assignmentHist, start, end) {
  const resolvedInPeriod = tickets.filter(
    (t) => ['resolved', 'closed'].includes(t.status) && isWithinRange(t.closed_at, start, end)
  );
  const resolved = resolvedInPeriod.length;
  const active = tickets.filter((t) =>
    ['todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)
  ).length;

  const employeeStats = new Map();
  users.forEach((user) => {
    employeeStats.set(user.id, { reroutes: 0, active: 0 });
  });

  tickets.forEach((t) => {
    if (!t.assigned_to_id) return;
    const stat = employeeStats.get(t.assigned_to_id);
    if (!stat) return;
    if (['todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)) {
      stat.active++;
    }
  });

  const assignmentsByTicket = new Map();
  assignmentHist.forEach((h) => {
    assignmentsByTicket.set(h.ticket_id, (assignmentsByTicket.get(h.ticket_id) || 0) + 1);
  });

  assignmentsByTicket.forEach((count, ticketId) => {
    if (count <= 1) return;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket?.assigned_to_id) return;
    const stat = employeeStats.get(ticket.assigned_to_id);
    if (stat) stat.reroutes += count - 1;
  });

  let overloadCount = 0;
  let rerouteCount = 0;
  employeeStats.forEach((stat) => {
    if (stat.active >= 8) overloadCount++;
    if (stat.reroutes > 3) rerouteCount++;
  });

  const avgTimeToResolveHours =
    resolvedInPeriod.length > 0
      ? resolvedInPeriod.reduce(
          (sum, t) => sum + (new Date(t.closed_at) - new Date(t.created_at)) / (1000 * 60 * 60),
          0
        ) / resolvedInPeriod.length
      : 0;

  return {
    resolved,
    active,
    avgTimeToResolveHours,
    overloadCount,
    rerouteCount,
    teamSize: users.length,
  };
}

function renderKpiDelta(delta) {
  if (!delta?.text) return '';
  return `<div class="kpi-delta ${delta.className}">${escapeHtml(delta.text)}</div>`;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getReportPeriod(period = '30d') {
  const end = endOfDay(new Date());
  const isWeek = period === '7d';

  if (isWeek) {
    const start = startOfWeekMonday(end);
    const weekEnd = new Date(start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startDay = start.toLocaleDateString('en-US', { day: '2-digit' });
    const endDay = weekEnd.toLocaleDateString('en-US', { day: '2-digit' });
    const monthName = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const titleHeading = `${startDay}-${endDay} ${monthName} HR REPORT`;
    const periodLabel = `Week range: ${formatShortDate(start)} - ${formatShortDate(weekEnd)}, ${end.getFullYear()}`;
    return {
      periodType: 'week',
      start,
      end,
      titleHeading,
      periodLabel,
      filenameSuffix: `week-${start.toISOString().split('T')[0]}`,
    };
  }

  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const monthName = end.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const titleHeading = `${monthName} ${end.getFullYear()} REPORT`;
  const periodLabel = `${end.toLocaleString('en-US', { month: 'long' })} ${end.getFullYear()} (month to date)`;

  return {
    periodType: 'month',
    start,
    end,
    titleHeading,
    periodLabel,
    filenameSuffix: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`,
  };
}

function isWithinRange(isoDate, start, end) {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function computePerformanceScore(employee) {
  const { resolved, active, avgResolutionHours, reroutes, department } = employee;
  const isSupport = SUPPORT_DEPTS.has(department);

  let score = resolved * 12;
  score += Math.min(active, 6) * 2;
  if (active > 8) score -= (active - 8) * 6;
  score -= reroutes * 4;
  if (avgResolutionHours > 0) {
    if (avgResolutionHours <= 24) score += 8;
    else if (avgResolutionHours <= 48) score += 4;
    else score -= Math.min(20, Math.floor((avgResolutionHours - 48) / 12));
  }
  if (isSupport && resolved === 0 && active === 0) score -= 35;
  else if (!isSupport && resolved === 0 && active === 0) score -= 5;
  if (resolved >= 8 && avgResolutionHours > 0 && avgResolutionHours <= 36) score += 10;
  return Math.round(score);
}

function tierFromScore(score, rank, total, employee) {
  const percentile = total <= 1 ? 1 : 1 - (rank - 1) / (total - 1);
  const isSupport = SUPPORT_DEPTS.has(employee.department);
  const isHrOrAdmin = employee.department === 'HR' || employee.systemRole === 'Admin';

  if (
    employee.resolved >= 3 &&
    (percentile >= 0.85 || score >= 60) &&
    employee.active <= 10 &&
    employee.reroutes <= 2
  ) {
    return 'exceptional';
  }

  if (
    employee.active >= 10 ||
    employee.reroutes >= 5 ||
    (isSupport && percentile <= 0.15 && employee.resolved < 2) ||
    (isSupport && score <= 0)
  ) {
    return 'needs_attention';
  }

  return 'steady';
}

function buildRuleBasedAnalysis({
  periodLabel,
  resolved,
  active,
  avgTimeToResolveHours,
  activeUsers,
  workforce,
  teamStats,
  overloadedRisk,
  rerouteRisk,
  exceptional,
  needsAttention,
}) {
  const lines = [];

  lines.push(
    `${periodLabel}: organization closed ${resolved} tickets with ${active} currently active. ` +
      `Average resolution time is ${Math.round(avgTimeToResolveHours)} hours across ${activeUsers} support staff.`
  );

  if (exceptional.length > 0) {
    lines.push(
      `⭐ Exceptional performers: ${exceptional.map((e) => `${e.name} (${e.resolved} closed)`).join(', ')}. ` +
        `Strong candidates for recognition, mentoring opportunities, or expanded responsibilities.`
    );
  }

  if (needsAttention.length > 0) {
    const overloadGroup = needsAttention.filter((e) => e.active >= 10);
    const rerouteGroup = needsAttention.filter((e) => e.reroutes >= 5);
    const underperformGroup = needsAttention.filter((e) => !overloadGroup.includes(e) && !rerouteGroup.includes(e));

    if (overloadGroup.length > 0) {
      lines.push(
        `🔴 Overload risk: ${overloadGroup.map((e) => e.name).join(', ')} have 10+ active tickets. ` +
          `Review workload distribution and consider reassignment or support.`
      );
    }

    if (rerouteGroup.length > 0) {
      lines.push(
        `⚠️ High reroutes: ${rerouteGroup.map((e) => e.name).join(', ')} show frequent reassignments (5+). ` +
          `Investigate root cause—skill gaps, routing patterns, or ticket complexity mismatch.`
      );
    }

    if (underperformGroup.length > 0) {
      lines.push(
        `⚡ Performance watch: ${underperformGroup.map((e) => e.name).join(', ')} are below peer baseline. ` +
          `One-on-one check-in recommended to identify support needs or role fit concerns.`
      );
    }
  }

  const busiestDept = [...teamStats].sort((a, b) => b.activeTickets - a.activeTickets)[0];
  if (busiestDept && busiestDept.activeTickets > 0) {
    lines.push(
      `${busiestDept.department} carries the highest workload: ${busiestDept.activeTickets} active tickets, ` +
        `${busiestDept.utilization} per person. Monitor closely for burnout.`
    );
  }

  return lines.join('\n\n');
}

function buildReportHtml({
  periodMeta,
  resolved,
  active,
  avgTimeToResolveHours,
  users,
  teamStats,
  rankedWorkforce,
  exceptional,
  needsAttention,
  overloadedRisk,
  rerouteRisk,
  aiAnalysis,
  chartConfigJson,
  generatedAt,
  kpiDeltas,
}) {
  const exceptionalCards =
    exceptional.length > 0
      ? exceptional
          .map(
            (e) => `
        <article class="mini-card mini-card--success">
          <div class="mini-card-tag">#${e.rank} · ${e.performanceScore}</div>
          <p class="mini-card-name">${escapeHtml(e.name)}</p>
          <p class="mini-card-role">${escapeHtml(e.department)}</p>
          <p class="mini-card-stat">${e.resolved} closed · ${e.active} active</p>
        </article>`
          )
          .join('')
      : '<p class="panel-empty">No exceptional performers flagged for this period.</p>';

  const attentionCards =
    needsAttention.length > 0
      ? needsAttention
          .map(
            (e) => `
        <article class="mini-card mini-card--attention">
          <div class="mini-card-tag">#${e.rank} · ${e.performanceScore}</div>
          <p class="mini-card-name">${escapeHtml(e.name)}</p>
          <p class="mini-card-role">${escapeHtml(e.department)}</p>
          <p class="mini-card-stat">${e.resolved} closed · ${e.active} active</p>
          ${e.attentionReason ? `<p class="mini-card-note">${escapeHtml(e.attentionReason)}</p>` : ''}
        </article>`
          )
          .join('')
      : '<p class="panel-empty">No underperformance flags for this period.</p>';

  const teamRows = teamStats
    .map(
      (t) => `
      <tr class="${t.utilization > 8 ? 'highlight' : ''}">
        <td><strong>${escapeHtml(t.department)}</strong></td>
        <td>${t.teamSize}</td>
        <td>${t.totalResolved}</td>
        <td>${t.activeTickets}</td>
        <td>${t.utilization}</td>
        <td>${t.avgResolutionTime}h</td>
      </tr>`
    )
    .join('');

  const workforceJson = JSON.stringify(rankedWorkforce).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(periodMeta.titleHeading)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    /* Ollama design tokens — ollama/DESIGN.md */
    :root {
      --primary: #000000;
      --on-primary: #ffffff;
      --ink: #000000;
      --ink-deep: #090909;
      --charcoal: #525252;
      --body: #737373;
      --mute: #a3a3a3;
      --canvas: #ffffff;
      --surface-soft: #fafafa;
      --hairline: #e5e5e5;
      --hairline-strong: #d4d4d4;
      --surface-dark: #171717;
      --on-dark: #ffffff;
      --on-dark-mute: rgba(255,255,255,0.7);
      --terminal-red: #ff5f56;
      --terminal-yellow: #ffbd2e;
      --terminal-green: #27c93f;
      --positive: #15803d;
      --positive-bg: #ecfdf5;
      --positive-border: #bbf7d0;
      --negative: #7f1d1d;
      --negative-bg: #fef2f2;
      --negative-border: #fecaca;
      --font-display: 'Nunito', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif;
      --font-body: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
      --rounded-lg: 12px;
      --rounded-full: 9999px;
      --section: 64px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font-body);
      font-size: 16px;
      font-weight: 400;
      line-height: 1.5;
      color: var(--ink);
      background: var(--canvas);
      -webkit-font-smoothing: antialiased;
    }
    .primary-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      padding: 0 24px;
      border-bottom: 1px solid var(--hairline);
      max-width: 960px;
      margin: 0 auto;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
      text-decoration: none;
    }
    .llama-mark { width: 28px; height: 32px; color: var(--ink); flex-shrink: 0; }
    .nav-pill {
      font-family: var(--font-mono);
      font-size: 14px;
      color: var(--ink);
      background: var(--surface-soft);
      padding: 8px 16px;
      border-radius: var(--rounded-full);
      white-space: nowrap;
    }
    .doc {
      max-width: 960px;
      margin: 0 auto;
      padding: var(--section) 24px 88px;
    }
    .hero {
      text-align: center;
      margin-bottom: var(--section);
    }
    .hero-mascot {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
      color: var(--ink);
    }
    .hero-mascot .llama-mark { width: 56px; height: 64px; }
    .hero h1 {
      margin: 0 0 12px;
      font-family: var(--font-display);
      font-size: clamp(28px, 5vw, 36px);
      font-weight: 500;
      line-height: 1.11;
      letter-spacing: 0;
      color: var(--ink);
    }
    .hero-sub {
      margin: 0 0 20px;
      font-size: 14px;
      color: var(--body);
      line-height: 1.43;
    }
    .meta-snippet {
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px 16px;
      font-family: var(--font-mono);
      font-size: 14px;
      color: var(--ink);
      background: var(--surface-soft);
      padding: 12px 20px;
      border-radius: var(--rounded-full);
      max-width: 100%;
    }
    .meta-snippet span { color: var(--mute); }
    .section { margin-bottom: var(--section); }
    .section-title {
      margin: 0 0 8px;
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 600;
      line-height: 1.33;
      color: var(--ink);
    }
    .section-lead { margin: 0 0 24px; font-size: 14px; color: var(--body); line-height: 1.43; }
    .spotlight-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: var(--section);
    }
    @media (max-width: 768px) { .spotlight-grid { grid-template-columns: 1fr; } }
    .pricing-card {
      background: var(--canvas);
      border: 1px solid var(--hairline);
      border-radius: var(--rounded-lg);
      padding: 32px;
    }
    .pricing-card-dark {
      background: var(--surface-dark);
      border: 1px solid var(--surface-dark);
      border-radius: var(--rounded-lg);
      padding: 32px;
      color: var(--on-dark);
    }
    .pricing-card h2, .pricing-card-dark h2 {
      margin: 0 0 20px;
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 500;
      line-height: 1.4;
    }
    .pricing-card-dark h2 { color: var(--on-dark); }
    .feature-row {
      display: flex;
      gap: 12px;
      padding: 16px 0;
      border-bottom: 1px solid var(--hairline);
    }
    .feature-row:last-child { border-bottom: none; padding-bottom: 0; }
    .feature-check, .feature-mark {
      flex-shrink: 0;
      width: 20px;
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.5;
    }
    .feature-row--on-dark { border-bottom-color: rgba(255,255,255,0.12); }
    .feature-row--on-dark .feature-mark { color: var(--on-dark); }
    .feature-name { margin: 0 0 4px; font-size: 16px; font-weight: 500; color: var(--ink); }
    .feature-row--on-dark .feature-name { color: var(--on-dark); }
    .feature-meta { margin: 0; font-size: 14px; color: var(--charcoal); line-height: 1.43; }
    .feature-row--on-dark .feature-meta { color: var(--on-dark-mute); }
    .feature-stat { margin: 6px 0 0; font-size: 14px; font-weight: 500; color: var(--ink); }
    .feature-row--on-dark .feature-stat { color: var(--on-dark); }
    .feature-reason { margin: 6px 0 0; font-size: 12px; color: var(--on-dark-mute); }
    .panel-empty { margin: 0; font-size: 14px; color: var(--body); }
    .panel-empty--on-dark { color: var(--on-dark-mute); }
    .meta-snippet .sep { color: var(--mute); }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 1px;
      background: var(--hairline);
      border: 1px solid var(--hairline);
      border-radius: var(--rounded-lg);
      overflow: hidden;
      margin-bottom: var(--section);
    }
    @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 500px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .kpi {
      background: var(--canvas);
      padding: 20px 16px;
      text-align: center;
    }
    .kpi-label {
      font-size: 12px;
      color: var(--body);
      margin-bottom: 8px;
      line-height: 1.33;
    }
    .kpi-value {
      font-family: var(--font-display);
      font-size: 30px;
      font-weight: 500;
      line-height: 1.2;
      color: var(--ink);
    }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: var(--section);
    }
    @media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } }
    .terminal-card {
      background: var(--canvas);
      border: 1px solid var(--hairline);
      border-radius: var(--rounded-lg);
      padding: 16px;
    }
    .terminal-card--wide { grid-column: 1 / -1; }
    .terminal-header { display: flex; gap: 6px; margin-bottom: 14px; }
    .traffic { width: 12px; height: 12px; border-radius: var(--rounded-full); }
    .traffic--red { background: var(--terminal-red); }
    .traffic--yellow { background: var(--terminal-yellow); }
    .traffic--green { background: var(--terminal-green); }
    .terminal-card h3 {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
    }
    .chart-wrap { position: relative; height: 200px; }
    .terminal-card--wide .chart-wrap { height: 230px; }
    .panel { margin-bottom: var(--section); padding-bottom: var(--section); border-bottom: 1px solid var(--hairline); }
    .panel:last-of-type { border-bottom: none; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th {
      padding: 12px 0;
      text-align: left;
      font-size: 12px;
      font-weight: 500;
      color: var(--body);
      border-bottom: 1px solid var(--hairline);
      white-space: nowrap;
    }
    td { padding: 16px 12px 16px 0; border-bottom: 1px solid var(--hairline); color: var(--charcoal); }
    td strong { color: var(--ink); font-weight: 500; }
    tbody tr:hover td { background: var(--surface-soft); }
    tr.highlight td { background: var(--surface-soft); }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 20px;
    }
    .toolbar input {
      flex: 1;
      min-width: 200px;
      height: 40px;
      padding: 8px 16px;
      font: inherit;
      font-size: 16px;
      color: var(--ink);
      background: var(--canvas);
      border: 1px solid var(--hairline);
      border-radius: var(--rounded-full);
    }
    .toolbar input:focus {
      outline: none;
      border-color: var(--ink);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.5);
    }
    .toolbar select {
      height: 36px;
      padding: 8px 16px;
      font: inherit;
      font-size: 14px;
      color: var(--ink);
      background: var(--surface-soft);
      border: none;
      border-radius: var(--rounded-full);
      cursor: pointer;
    }
    .toolbar-meta { font-size: 12px; color: var(--body); margin-left: auto; }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: var(--rounded-full);
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
    }
    .badge--exceptional { background: var(--positive-bg); color: var(--positive); border: 1px solid var(--positive-border); }
    .badge--steady { background: var(--surface-soft); color: var(--charcoal); }
    .badge--attention { background: var(--negative-bg); color: var(--negative); border: 1px solid var(--negative-border); }
    .rank-cell { font-family: var(--font-mono); font-size: 14px; color: var(--mute); width: 40px; }
    .table-scroll { overflow-x: auto; }
    .pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--hairline);
    }
    .btn {
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      line-height: 1;
      height: 36px;
      padding: 8px 20px;
      border-radius: var(--rounded-full);
      cursor: pointer;
      border: 1px solid var(--hairline-strong);
      background: var(--canvas);
      color: var(--ink);
    }
    .btn:disabled { background: var(--surface-soft); color: var(--mute); cursor: not-allowed; }
    .btn:not(:disabled):active { background: var(--surface-soft); }
    .faq-block { margin-bottom: var(--section); }
    .faq-block h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 500;
      line-height: 1.56;
      color: var(--ink);
    }
    .faq-block p {
      margin: 0;
      font-size: 16px;
      line-height: 1.5;
      color: var(--body);
      white-space: pre-wrap;
    }
    .site-footer {
      padding: 32px 0 0;
      border-top: 1px solid var(--hairline);
      font-size: 12px;
      color: var(--body);
      text-align: center;
      line-height: 1.33;
    }
    .brand-logo { width: 48px; height: 48px; display: block; margin: 0 auto 16px; }
    .people-section { margin-bottom: 40px; }
    .people-heading {
      margin: 0 0 14px;
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 500;
      line-height: 1.4;
    }
    .people-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
      gap: 10px;
    }
    .mini-card {
      border: 1px solid var(--hairline);
      border-radius: var(--rounded-lg);
      padding: 12px 14px;
      background: var(--canvas);
    }
    .mini-card--success { background: var(--positive-bg); border-color: var(--positive-border); }
    .mini-card--attention { background: var(--negative-bg); border-color: var(--negative-border); }
    .mini-card-tag {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--mute);
      margin-bottom: 6px;
    }
    .mini-card--success .mini-card-tag { color: var(--positive); }
    .mini-card--attention .mini-card-tag { color: var(--negative); }
    .mini-card-name { margin: 0 0 2px; font-size: 14px; font-weight: 500; line-height: 1.25; }
    .mini-card-role { margin: 0 0 8px; font-size: 11px; color: var(--body); line-height: 1.3; }
    .mini-card--attention .mini-card-role { color: #991b1b; }
    .mini-card-stat {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      line-height: 1.35;
    }
    .mini-card-note { margin: 6px 0 0; font-size: 10px; line-height: 1.3; color: var(--negative); }
    .panel-empty { margin: 0; font-size: 14px; color: var(--body); }
    .kpi-delta {
      margin-top: 6px;
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 1.3;
      color: var(--body);
    }
    .kpi-delta--positive { color: var(--positive); font-weight: 500; }
    .kpi-delta--negative { color: var(--negative); font-weight: 500; }
    .kpi-delta--neutral { color: var(--mute); }
    .section-block {
      margin-bottom: var(--section);
      padding-bottom: var(--section);
      border-bottom: 1px solid var(--hairline);
    }
    .section-block:last-of-type { border-bottom: none; }
    @media print {
      .toolbar, .pagination .btn { display: none; }
    }
  </style>
</head>
<body>
  <main class="doc">
    <header class="hero">
      ${LUMINA_LOGO_SVG}
      <h1>${escapeHtml(periodMeta.titleHeading)}</h1>
      <p class="hero-sub">${escapeHtml(periodMeta.periodLabel)}</p>
      <div class="meta-snippet">
        Generated ${escapeHtml(generatedAt)}
        <span class="sep"> · </span>${users.length} people
        <span class="sep"> · </span>ranked best → needs support
      </div>
    </header>

    <section class="people-section" aria-label="Top performers">
      <h2 class="people-heading">Performing exceptionally</h2>
      <div class="people-grid">${exceptionalCards}</div>
    </section>

    <section class="people-section" aria-label="Needs attention">
      <h2 class="people-heading">Needs attention</h2>
      <div class="people-grid">${attentionCards}</div>
    </section>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Closed this period</div><div class="kpi-value">${resolved}</div>${renderKpiDelta(kpiDeltas.closed)}</div>
      <div class="kpi"><div class="kpi-label">Active now</div><div class="kpi-value">${active}</div>${renderKpiDelta(kpiDeltas.active)}</div>
      <div class="kpi"><div class="kpi-label">Avg resolution</div><div class="kpi-value">${Math.round(avgTimeToResolveHours)}h</div>${renderKpiDelta(kpiDeltas.avgResolution)}</div>
      <div class="kpi"><div class="kpi-label">Team size</div><div class="kpi-value">${users.length}</div>${renderKpiDelta(kpiDeltas.teamSize)}</div>
      <div class="kpi"><div class="kpi-label">Overload risk</div><div class="kpi-value">${overloadedRisk.length}</div>${renderKpiDelta(kpiDeltas.overload)}</div>
      <div class="kpi"><div class="kpi-label">High reroutes</div><div class="kpi-value">${rerouteRisk.length}</div>${renderKpiDelta(kpiDeltas.reroutes)}</div>
    </div>

    <div class="charts-grid">
      <div class="terminal-card">
        <div class="terminal-header"><span class="traffic traffic--red"></span><span class="traffic traffic--yellow"></span><span class="traffic traffic--green"></span></div>
        <h3>Headcount by department</h3>
        <div class="chart-wrap"><canvas id="headcountChart"></canvas></div>
      </div>
      <div class="terminal-card">
        <div class="terminal-header"><span class="traffic traffic--red"></span><span class="traffic traffic--yellow"></span><span class="traffic traffic--green"></span></div>
        <h3>Active workload</h3>
        <div class="chart-wrap"><canvas id="workloadChart"></canvas></div>
      </div>
      <div class="terminal-card terminal-card--wide">
        <div class="terminal-header"><span class="traffic traffic--red"></span><span class="traffic traffic--yellow"></span><span class="traffic traffic--green"></span></div>
        <h3>Top performers — closed vs active</h3>
        <div class="chart-wrap"><canvas id="performersChart"></canvas></div>
      </div>
    </div>

    <section class="section-block">
      <h2 class="section-title">Team performance by department</h2>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Department</th><th>Size</th><th>Closed</th><th>Active</th><th>Tickets/person</th><th>Avg resolution</th></tr></thead>
          <tbody>${teamRows}</tbody>
        </table>
      </div>
    </section>

    <section class="section-block">
      <h2 class="section-title">Individual performance ranking</h2>
      <p class="section-lead">Best performers first. Search, filter, and paginate below.</p>
      <div class="toolbar">
        <input type="search" id="workforceSearch" placeholder="Search name, department, or role…" autocomplete="off" aria-label="Search workforce" />
        <select id="deptFilter" aria-label="Filter by department"><option value="">All departments</option></select>
        <select id="tierFilter" aria-label="Filter by tier">
          <option value="">All tiers</option>
          <option value="exceptional">Exceptional</option>
          <option value="steady">Steady</option>
          <option value="needs_attention">Needs attention</option>
        </select>
        <select id="pageSize" aria-label="Rows per page">
          <option value="10">10 per page</option>
          <option value="25" selected>25 per page</option>
          <option value="50">50 per page</option>
        </select>
        <span class="toolbar-meta" id="resultCount"></span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Employee</th><th>Department</th><th>Role</th><th>Tier</th>
              <th>Score</th><th>Closed</th><th>Active</th><th>Avg time</th><th>Reroutes</th>
            </tr>
          </thead>
          <tbody id="workforceBody"></tbody>
        </table>
      </div>
      <div class="pagination">
        <button type="button" class="btn" id="prevPage">← Previous</button>
        <span id="pageInfo" style="font-size:14px;color:var(--body)"></span>
        <button type="button" class="btn" id="nextPage">Next →</button>
      </div>
    </section>

    <section class="faq-block">
      <h3>Analysis &amp; recommendations</h3>
      <p>${escapeHtml(aiAnalysis)}</p>
    </section>

    <footer class="site-footer">Lumina HR Intelligence · ${escapeHtml(periodMeta.periodLabel)}</footer>
  </main>

  <script>
    const chartData = ${chartConfigJson};
    const CHART_CLOSED = '#16a34a';
    const CHART_ACTIVE = '#2563eb';
    const workforceData = ${workforceJson};

    const chartDefaults = { responsive: true, maintainAspectRatio: false };
    const chartFont = { family: 'ui-sans-serif, system-ui, sans-serif', size: 11 };
    const gridColor = '#e5e5e5';

    new Chart(document.getElementById('headcountChart'), {
      type: 'doughnut',
      data: {
        labels: chartData.headcount.map(d => d.label),
        datasets: [{ data: chartData.headcount.map(d => d.value), backgroundColor: chartData.headcount.map(d => d.color), borderWidth: 0 }]
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: chartFont, color: '#525252' } } }
      }
    });

    new Chart(document.getElementById('workloadChart'), {
      type: 'bar',
      data: {
        labels: chartData.workload.map(d => d.label),
        datasets: [{ label: 'Active', data: chartData.workload.map(d => d.value), backgroundColor: chartData.workload.map(d => d.color), borderRadius: 8 }]
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: chartFont, color: '#737373' } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: chartFont, color: '#737373' }, grid: { color: gridColor } }
        }
      }
    });

    new Chart(document.getElementById('performersChart'), {
      type: 'bar',
      data: {
        labels: chartData.performers.map(d => d.label),
        datasets: [
          { label: 'Closed', data: chartData.performers.map(d => d.resolved), backgroundColor: CHART_CLOSED, borderRadius: 8 },
          { label: 'Active', data: chartData.performers.map(d => d.active), backgroundColor: CHART_ACTIVE, borderRadius: 8 }
        ]
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { position: 'top', labels: { font: chartFont, color: '#525252' } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: chartFont, color: '#737373' } },
          y: { beginAtZero: true, ticks: { font: chartFont, color: '#737373' }, grid: { color: gridColor } }
        }
      }
    });

    const tierLabels = { exceptional: 'Exceptional', steady: 'Steady', needs_attention: 'Needs attention' };
    const tierBadge = { exceptional: 'badge--exceptional', steady: 'badge--steady', needs_attention: 'badge--attention' };

    const deptFilter = document.getElementById('deptFilter');
    const departments = [...new Set(workforceData.map(e => e.department))].sort();
    departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      deptFilter.appendChild(opt);
    });

    let currentPage = 1;
    const searchEl = document.getElementById('workforceSearch');
    const tierFilterEl = document.getElementById('tierFilter');
    const pageSizeEl = document.getElementById('pageSize');
    const bodyEl = document.getElementById('workforceBody');
    const resultCountEl = document.getElementById('resultCount');
    const pageInfoEl = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    function getFiltered() {
      const q = searchEl.value.trim().toLowerCase();
      const dept = deptFilter.value;
      const tier = tierFilterEl.value;
      return workforceData.filter(e => {
        if (dept && e.department !== dept) return false;
        if (tier && e.tier !== tier) return false;
        if (!q) return true;
        const hay = (e.name + ' ' + e.department + ' ' + e.jobTitle + ' ' + e.systemRole).toLowerCase();
        return hay.includes(q);
      });
    }

    function renderTable() {
      const filtered = getFiltered();
      const pageSize = parseInt(pageSizeEl.value, 10) || 25;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const page = filtered.slice(start, start + pageSize);

      bodyEl.innerHTML = page.map(e => \`
        <tr class="\${e.active >= 8 ? 'highlight' : ''}">
          <td class="rank-cell">\${e.rank}</td>
          <td><strong>\${e.name}</strong></td>
          <td>\${e.department}</td>
          <td style="color:var(--body);font-size:13px">\${e.jobTitle}</td>
          <td><span class="badge \${tierBadge[e.tier] || 'badge--steady'}">\${tierLabels[e.tier] || e.tier}</span></td>
          <td><strong>\${e.performanceScore}</strong></td>
          <td>\${e.resolved}</td>
          <td>\${e.active}</td>
          <td>\${e.avgResolutionHours}h</td>
          <td>\${e.reroutes}</td>
        </tr>\`).join('');

      resultCountEl.textContent = filtered.length + ' of ' + workforceData.length + ' people';
      pageInfoEl.textContent = 'Page ' + currentPage + ' of ' + totalPages;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
    }

    searchEl.addEventListener('input', () => { currentPage = 1; renderTable(); });
    deptFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
    tierFilterEl.addEventListener('change', () => { currentPage = 1; renderTable(); });
    pageSizeEl.addEventListener('change', () => { currentPage = 1; renderTable(); });
    prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
    nextBtn.addEventListener('click', () => { currentPage++; renderTable(); });

    renderTable();
  </script>
</body>
</html>`;
}

async function generateHrReport(period = '30d') {
  const periodMeta = getReportPeriod(period);
  const { start, end, periodLabel, titleHeading } = periodMeta;
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const generatedAt = new Date().toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const [ticketsRes, usersRes, assignmentHistRes] = await Promise.all([
    db.query(
      `SELECT t.id, t.title, t.status, t.submitted_by, t.created_at, t.closed_at, t.priority,
              ta.assigned_to AS assigned_to_id
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       WHERE (t.closed_at >= $1 AND t.closed_at <= $2)
          OR (t.created_at >= $1 AND t.created_at <= $2)
          OR t.status IN ('todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing')
       ORDER BY t.created_at DESC`,
      [startIso, endIso]
    ),
    db.query(
      `SELECT id, first_name, last_name, department, job_title, role, status, created_at
       FROM users
       WHERE status = 'active'
         AND (department IS NULL OR (department <> 'Managers' AND department <> 'HR'))
       ORDER BY department NULLS LAST, last_name, first_name`
    ),
    db.query(
      `SELECT ta.ticket_id, ta.assigned_to
       FROM ticket_assignment ta
       WHERE ta.assigned_at >= $1 AND ta.assigned_at <= $2`,
      [startIso, endIso]
    ),
  ]);

  const tickets = ticketsRes.rows;
  const users = usersRes.rows;
  const assignmentHist = assignmentHistRes.rows;

  const resolvedInPeriod = tickets.filter(
    (t) => ['resolved', 'closed'].includes(t.status) && isWithinRange(t.closed_at, start, end)
  );
  const resolved = resolvedInPeriod.length;
  const active = tickets.filter((t) =>
    ['todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)
  ).length;

  const employeeStats = new Map();
  users.forEach((user) => {
    employeeStats.set(user.id, {
      name: `${user.first_name} ${user.last_name}`,
      id: user.id,
      department: user.department?.trim() || 'Unknown',
      jobTitle: user.job_title?.trim() || '—',
      systemRole: user.role === 'admin' ? 'Admin' : 'User',
      resolved: 0,
      active: 0,
      avgResolutionHours: 0,
      reroutes: 0,
    });
  });

  tickets.forEach((t) => {
    if (!t.assigned_to_id) return;
    const stat = employeeStats.get(t.assigned_to_id);
    if (!stat) return;
    if (['resolved', 'closed'].includes(t.status) && isWithinRange(t.closed_at, start, end)) {
      stat.resolved++;
    }
    if (['todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)) {
      stat.active++;
    }
  });

  const assignmentsByTicket = new Map();
  assignmentHist.forEach((h) => {
    assignmentsByTicket.set(h.ticket_id, (assignmentsByTicket.get(h.ticket_id) || 0) + 1);
  });

  assignmentsByTicket.forEach((count, ticketId) => {
    if (count <= 1) return;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket?.assigned_to_id) return;
    const stat = employeeStats.get(ticket.assigned_to_id);
    if (stat) stat.reroutes += count - 1;
  });

  const employeeResolutionTimes = new Map();
  resolvedInPeriod
    .filter((t) => t.assigned_to_id && t.closed_at)
    .forEach((t) => {
      const hours = (new Date(t.closed_at) - new Date(t.created_at)) / (1000 * 60 * 60);
      if (!employeeResolutionTimes.has(t.assigned_to_id)) {
        employeeResolutionTimes.set(t.assigned_to_id, []);
      }
      employeeResolutionTimes.get(t.assigned_to_id).push(hours);
    });

  employeeStats.forEach((stat, id) => {
    const times = employeeResolutionTimes.get(id) || [];
    if (times.length > 0) {
      stat.avgResolutionHours = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    }
  });

  const workforce = Array.from(employeeStats.values())
    .filter((e) => !isSystemAccount(e.name))
    .map((e) => ({
      ...e,
      performanceScore: computePerformanceScore(e),
    }));

  const rankedWorkforce = [...workforce]
    .sort((a, b) => b.performanceScore - a.performanceScore || b.resolved - a.resolved)
    .map((e, idx) => {
      const rank = idx + 1;
      const tier = tierFromScore(e.performanceScore, rank, workforce.length, e);
      let attentionReason = '';
      if (tier === 'needs_attention') {
        if (e.active >= 10) {
          attentionReason = 'Critical overload (10+ active tickets)';
        } else if (e.reroutes >= 5) {
          attentionReason = 'Very high reroute count';
        } else if (SUPPORT_DEPTS.has(e.department) && e.resolved < 2) {
          attentionReason = 'Low closure volume for support role';
        } else {
          attentionReason = 'Below peer performance baseline';
        }
      }
      return { ...e, rank, tier, attentionReason };
    });

  const exceptional = rankedWorkforce.filter((e) => e.tier === 'exceptional').slice(0, 8);
  const needsAttention = rankedWorkforce.filter((e) => e.tier === 'needs_attention').slice(0, 8);

  const deptHeadcount = new Map();
  users.forEach((user) => {
    const dept = user.department?.trim() || 'Unknown';
    deptHeadcount.set(dept, (deptHeadcount.get(dept) || 0) + 1);
  });

  const deptActiveTickets = new Map();
  tickets
    .filter((t) => ['todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status))
    .forEach((t) => {
      const assignee = users.find((u) => u.id === t.assigned_to_id);
      const dept = assignee?.department?.trim() || 'Unassigned';
      deptActiveTickets.set(dept, (deptActiveTickets.get(dept) || 0) + 1);
    });

  const allDepts = [...new Set([...deptHeadcount.keys(), ...deptActiveTickets.keys()])].sort(
    (a, b) => deptSortKey(a) - deptSortKey(b)
  );

  const teamStats = allDepts.map((department) => {
    const teamSize = deptHeadcount.get(department) || 0;
    const activeTickets = deptActiveTickets.get(department) || 0;
    const members = rankedWorkforce.filter((e) => e.department === department);
    const totalResolved = members.reduce((sum, e) => sum + e.resolved, 0);
    const withResolution = members.filter((e) => e.avgResolutionHours > 0);
    const avgResolutionTime =
      withResolution.length > 0
        ? Math.round(withResolution.reduce((sum, e) => sum + e.avgResolutionHours, 0) / withResolution.length)
        : 0;
    return {
      department,
      teamSize,
      activeTickets,
      totalResolved,
      avgResolutionTime,
      utilization: teamSize > 0 ? Math.round((activeTickets / teamSize) * 10) / 10 : 0,
    };
  });

  const avgTimeToResolveHours =
    resolvedInPeriod.length > 0
      ? resolvedInPeriod.reduce(
          (sum, t) => sum + (new Date(t.closed_at) - new Date(t.created_at)) / (1000 * 60 * 60),
          0
        ) / resolvedInPeriod.length
      : 0;

  const overloadedRisk = rankedWorkforce.filter((e) => e.active >= 8);
  const rerouteRisk = rankedWorkforce.filter((e) => e.reroutes > 3);
  const topPerformers = rankedWorkforce.filter((e) => e.resolved > 0).slice(0, 8);

  const headcountChartData = CHART_DEPTS.map((dept) => ({
    label: dept,
    value: deptHeadcount.get(dept) || 0,
    color: DEPT_COLORS[dept] || DEPT_COLORS.Unknown,
  }));

  const workloadChartData = CHART_DEPTS.map((dept) => ({
    label: dept,
    value: deptActiveTickets.get(dept) || 0,
    color: DEPT_COLORS[dept] || DEPT_COLORS.Unknown,
  }));

  const resolvedChartData = topPerformers.map((e) => ({
    label: e.name.split(' ')[0],
    resolved: e.resolved,
    active: e.active,
  }));

  const statsText = `
Report: ${titleHeading}
Period: ${periodLabel}
Closed in period: ${resolved} | Active now: ${active}
Avg resolution: ${Math.round(avgTimeToResolveHours)}h

Exceptional: ${exceptional.map((e) => e.name).join(', ') || 'None'}
Needs attention: ${needsAttention.map((e) => e.name).join(', ') || 'None'}

Top ranked:
${rankedWorkforce
  .slice(0, 12)
  .map((e) => `#${e.rank} ${e.name} (${e.department}): score ${e.performanceScore}, ${e.resolved} closed, ${e.active} active`)
  .join('\n')}
`;

  let aiAnalysis = buildRuleBasedAnalysis({
    periodLabel,
    resolved,
    active,
    avgTimeToResolveHours,
    activeUsers: users.length,
    workforce: rankedWorkforce,
    teamStats,
    overloadedRisk,
    rerouteRisk,
    exceptional,
    needsAttention,
  });

  try {
    const provider = getLuminaProvider();
    const apiKey = getLuminaApiKey();
    const model = getLuminaModel(provider);

    const systemPrompt = `You are an HR analytics assistant for an IT support ticketing platform.
Write a concise executive summary (2-3 short paragraphs, plain text, no JSON).
Reference the report period by name. Call out exceptional performers and those needing attention by name.
Cover resolution trends, workload by department, and 2-3 actionable recommendations.`;

    const aiText = await requestLuminaPlainText({
      provider,
      apiKey,
      model,
      systemPrompt,
      userContent: `Analyze these HR metrics:\n${statsText}`,
    });

    if (aiText?.trim()) {
      aiAnalysis = aiText.trim();
    }
  } catch (err) {
    console.error('HR AI analysis unavailable, using rule-based summary:', err.message);
    aiAnalysis = `${aiAnalysis}\n\n— Note: Lumina AI enhancement unavailable (${err.message}). Analysis above is rule-based.`;
  }

  const chartConfigJson = JSON.stringify({
    headcount: headcountChartData,
    workload: workloadChartData,
    performers: resolvedChartData,
  });

  const prevRange = getPreviousPeriodRange(periodMeta);
  const prevStartIso = prevRange.start.toISOString();
  const prevEndIso = prevRange.end.toISOString();

  const [prevTicketsRes, prevAssignmentHistRes] = await Promise.all([
    db.query(
      `SELECT t.id, t.title, t.status, t.submitted_by, t.created_at, t.closed_at, t.priority,
              ta.assigned_to AS assigned_to_id
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       WHERE (t.closed_at >= $1 AND t.closed_at <= $2)
          OR (t.created_at >= $1 AND t.created_at <= $2)
          OR t.status IN ('todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing')
       ORDER BY t.created_at DESC`,
      [prevStartIso, prevEndIso]
    ),
    db.query(
      `SELECT ta.ticket_id, ta.assigned_to
       FROM ticket_assignment ta
       WHERE ta.assigned_at >= $1 AND ta.assigned_at <= $2`,
      [prevStartIso, prevEndIso]
    ),
  ]);

  const currentKpis = {
    resolved,
    active,
    avgTimeToResolveHours,
    overloadCount: overloadedRisk.length,
    rerouteCount: rerouteRisk.length,
    teamSize: users.length,
  };
  const previousKpis = computePeriodKpis(
    prevTicketsRes.rows,
    users,
    prevAssignmentHistRes.rows,
    prevRange.start,
    prevRange.end
  );
  const kpiDeltas = buildKpiDeltas(currentKpis, previousKpis, periodMeta);

  const html = buildReportHtml({
    periodMeta,
    resolved,
    active,
    avgTimeToResolveHours,
    users,
    teamStats,
    rankedWorkforce,
    exceptional,
    needsAttention,
    overloadedRisk,
    rerouteRisk,
    aiAnalysis,
    chartConfigJson,
    generatedAt,
    kpiDeltas,
  });

  const markdown = `# ${titleHeading}

**Period:** ${periodLabel}  
**Generated:** ${generatedAt}  
**Team:** ${users.length} active members

## Executive summary
| Metric | Value |
|--------|-------|
| Closed this period | ${resolved} |
| Active now | ${active} |
| Avg resolution | ${Math.round(avgTimeToResolveHours)}h |
| Overload risk | ${overloadedRisk.length} |
| High reroutes | ${rerouteRisk.length} |

## ★ Exceptional performers
${exceptional.length > 0 ? exceptional.map((e) => `- **${e.name}** (${e.department}): ${e.resolved} closed, score ${e.performanceScore}`).join('\n') : '- None flagged'}

## ! Needs attention
${needsAttention.length > 0 ? needsAttention.map((e) => `- **${e.name}** (${e.department}): ${e.attentionReason}`).join('\n') : '- None flagged'}

## Individual ranking (best → needs support)
| Rank | Employee | Department | Tier | Score | Closed | Active | Avg | Reroutes |
|------|----------|------------|------|-------|--------|--------|-----|----------|
${rankedWorkforce.map((e) => `| ${e.rank} | ${e.name} | ${e.department} | ${e.tier} | ${e.performanceScore} | ${e.resolved} | ${e.active} | ${e.avgResolutionHours}h | ${e.reroutes} |`).join('\n')}

## Analysis
${aiAnalysis}
`.trim();

  return {
    html,
    markdown,
    filename: `hr-report-${periodMeta.filenameSuffix}`,
    periodLabel,
    titleHeading,
  };
}

module.exports = { generateHrReport, getReportPeriod, computePerformanceScore };
