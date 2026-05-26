const db = require('../db');
const { getLuminaApiKey, getLuminaProvider, getLuminaModel, requestLuminaPlainText } = require('./ticketRouting');

const DEPT_COLORS = {
  Managers: '#d97706',
  Developers: '#2563eb',
  QA: '#8b5cf6',
  HR: '#1f8a65',
  Unknown: '#6b7280',
};

const DEPT_ORDER = ['Managers', 'HR', 'Developers', 'QA', 'Unknown'];

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

function buildRuleBasedAnalysis({
  periodDays,
  resolved,
  active,
  avgTimeToResolveHours,
  activeUsers,
  workforce,
  teamStats,
  overloadedRisk,
  rerouteRisk,
}) {
  const lines = [];
  lines.push(
    `Over the last ${periodDays} days, the organization resolved ${resolved} tickets while ${active} remain active. ` +
      `Average resolution time is ${Math.round(avgTimeToResolveHours)} hours across ${activeUsers} active team members.`
  );

  const busiestDept = [...teamStats].sort((a, b) => b.activeTickets - a.activeTickets)[0];
  if (busiestDept && busiestDept.activeTickets > 0) {
    lines.push(
      `${busiestDept.department} carries the highest open workload (${busiestDept.activeTickets} active tickets, ` +
        `${busiestDept.utilization} per person). Consider redistributing assignments if utilization exceeds 8 tickets per person.`
    );
  }

  if (overloadedRisk.length > 0) {
    lines.push(
      `Overload risk: ${overloadedRisk.map((e) => e.name).join(', ')} each have 8+ active tickets. ` +
        'Prioritize reassignment or temporary support for these assignees.'
    );
  }

  if (rerouteRisk.length > 0) {
    lines.push(
      `High reroute counts for ${rerouteRisk.map((e) => e.name).join(', ')} may indicate ticket misclassification or unclear routing rules. ` +
        'Review intake templates and Lumina routing prompts for these queues.'
    );
  }

  const idle = workforce.filter((e) => e.resolved === 0 && e.active === 0);
  if (idle.length > 0 && idle.length <= 8) {
    lines.push(
      `${idle.length} team member(s) had no assigned ticket activity in this period (${idle.map((e) => e.name).join(', ')}). ` +
        'Confirm they are onboarded and receiving assignments.'
    );
  }

  const top = workforce.filter((e) => e.resolved > 0).slice(0, 3);
  if (top.length > 0) {
    lines.push(
      `Top closers: ${top.map((e) => `${e.name} (${e.resolved})`).join(', ')}. ` +
        'Use their throughput patterns as a benchmark for team capacity planning.'
    );
  }

  return lines.join('\n\n');
}

async function generateHrReport(period = '30d') {
  const periodDays = period === '7d' ? 7 : 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  const cutoffDateStr = cutoffDate.toISOString();

  const [ticketsRes, usersRes, assignmentHistRes] = await Promise.all([
    db.query(
      `SELECT t.id, t.title, t.status, t.submitted_by, t.created_at, t.closed_at, t.priority,
              ta.assigned_to AS assigned_to_id
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       WHERE t.created_at >= $1 OR t.closed_at >= $1 OR t.status IN ('open', 'assigned', 'in_progress', 'on_hold', 'pending_routing')
       ORDER BY t.created_at DESC`,
      [cutoffDateStr]
    ),
    db.query(
      `SELECT id, first_name, last_name, department, job_title, role, status, created_at
       FROM users
       WHERE status = 'active'
       ORDER BY department NULLS LAST, last_name, first_name`
    ),
    db.query(
      `SELECT ta.ticket_id, ta.assigned_to
       FROM ticket_assignment ta
       WHERE ta.assigned_at >= $1`,
      [cutoffDateStr]
    ),
  ]);

  const tickets = ticketsRes.rows;
  const users = usersRes.rows;
  const assignmentHist = assignmentHistRes.rows;

  const resolved = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const active = tickets.filter((t) =>
    ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)
  ).length;

  const employeeStats = new Map();
  users.forEach((user) => {
    const key = user.id;
    employeeStats.set(key, {
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
    if (['resolved', 'closed'].includes(t.status)) stat.resolved++;
    if (['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status)) stat.active++;
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
  tickets
    .filter((t) => ['resolved', 'closed'].includes(t.status) && t.assigned_to_id && t.closed_at)
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

  const workforce = Array.from(employeeStats.values()).sort(
    (a, b) => deptSortKey(a.department) - deptSortKey(b.department) || a.name.localeCompare(b.name)
  );

  const employeeRanking = [...workforce]
    .filter((e) => e.resolved > 0 || e.active > 0)
    .sort((a, b) => b.resolved - a.resolved || b.active - a.active);

  const deptHeadcount = new Map();
  users.forEach((user) => {
    const dept = user.department?.trim() || 'Unknown';
    deptHeadcount.set(dept, (deptHeadcount.get(dept) || 0) + 1);
  });

  const deptActiveTickets = new Map();
  tickets
    .filter((t) => ['open', 'assigned', 'in_progress', 'on_hold', 'pending_routing'].includes(t.status))
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
    const members = workforce.filter((e) => e.department === department);
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

  const resolvedTickets = tickets.filter((t) => ['resolved', 'closed'].includes(t.status) && t.closed_at);
  const avgTimeToResolveHours =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce(
          (sum, t) => sum + (new Date(t.closed_at) - new Date(t.created_at)) / (1000 * 60 * 60),
          0
        ) / resolvedTickets.length
      : 0;

  const overloadedRisk = workforce.filter((e) => e.active >= 8);
  const rerouteRisk = workforce.filter((e) => e.reroutes > 3);
  const topPerformers = employeeRanking.slice(0, 10);

  const headcountChartData = allDepts.map((dept) => ({
    label: dept,
    value: deptHeadcount.get(dept) || 0,
    color: DEPT_COLORS[dept] || DEPT_COLORS.Unknown,
  }));

  const workloadChartData = allDepts.map((dept) => ({
    label: dept,
    value: deptActiveTickets.get(dept) || 0,
    color: DEPT_COLORS[dept] || DEPT_COLORS.Unknown,
  }));

  const resolvedChartData = topPerformers.slice(0, 8).map((e) => ({
    label: e.name.split(' ')[0],
    resolved: e.resolved,
    active: e.active,
  }));

  const statsText = `
Period: Last ${periodDays} days
Total Tickets: ${tickets.length} | Resolved: ${resolved} | Active: ${active}
Avg Resolution Time: ${Math.round(avgTimeToResolveHours)}h
Active Team Members: ${users.length}

Workforce by department:
${teamStats.map((t) => `- ${t.department}: ${t.teamSize} people, ${t.activeTickets} active, ${t.totalResolved} resolved`).join('\n')}

Top activity:
${topPerformers.slice(0, 8).map((e) => `- ${e.name} (${e.department}, ${e.jobTitle}): ${e.resolved} resolved, ${e.active} active, ${e.reroutes} reroutes`).join('\n')}

Health:
- Overload (${overloadedRisk.length}): ${overloadedRisk.map((e) => e.name).join(', ') || 'None'}
- High reroutes (${rerouteRisk.length}): ${rerouteRisk.map((e) => e.name).join(', ') || 'None'}
`;

  let aiAnalysis = buildRuleBasedAnalysis({
    periodDays,
    resolved,
    active,
    avgTimeToResolveHours,
    activeUsers: users.length,
    workforce,
    teamStats,
    overloadedRisk,
    rerouteRisk,
  });

  try {
    const provider = getLuminaProvider();
    const apiKey = getLuminaApiKey();
    const model = getLuminaModel(provider);

    const systemPrompt = `You are an HR analytics assistant for an IT support ticketing platform.
Write a concise executive summary (2-3 short paragraphs, plain text, no JSON).
Cover: resolution trends, workload by department (Managers, Developers, QA, HR), overload/reroute risks, and 2-3 actionable recommendations.
Be specific using the numbers provided.`;

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

  const overloadRiskColor = overloadedRisk.length > 0 ? '#ef4444' : '#16a34a';
  const rerouteRiskColor = rerouteRisk.length > 0 ? '#f97316' : '#16a34a';

  const chartConfigJson = JSON.stringify({
    headcount: headcountChartData,
    workload: workloadChartData,
    performers: resolvedChartData,
  });

  const workforceRows = workforce
    .map((e) => {
      const rowClass = e.active >= 8 ? 'highlight' : e.reroutes > 3 ? 'warn' : '';
      return `
      <tr class="${rowClass}">
        <td><strong>${escapeHtml(e.name)}</strong></td>
        <td>${escapeHtml(e.department)}</td>
        <td style="color:#6b7280;font-size:12px">${escapeHtml(e.jobTitle)}</td>
        <td>${escapeHtml(e.systemRole)}</td>
        <td>${e.resolved}</td>
        <td>${e.active}</td>
        <td>${e.avgResolutionHours}h</td>
        <td>${e.reroutes}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HR Report - ${new Date().toLocaleDateString()}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; padding: 40px 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #1f2937; margin: 0 0 8px 0; font-size: 32px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 30px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 30px 0; }
    .kpi { background: #f3f4f6; padding: 16px; border-radius: 6px; border-left: 3px solid #3b82f6; }
    .kpi-label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #1f2937; }
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 32px 0; }
    .chart-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .chart-card h3 { margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; }
    .chart-wrap { position: relative; height: 220px; }
    .section { margin: 36px 0; }
    .section h2 { color: #1f2937; font-size: 18px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #d1d5db; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:hover { background: #f9fafb; }
    tr.highlight { background: #fee2e2; }
    tr.warn { background: #fff7ed; }
    .ai-section { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .ai-section h3 { margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 600; }
    .ai-section p { margin: 0; color: #4b5563; font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
    .footer { color: #9ca3af; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .table-scroll { overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>HR Intelligence Report</h1>
    <div class="meta">Period: Last ${periodDays} days | Generated: ${new Date().toLocaleString()} | ${users.length} active team members</div>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Resolved</div><div class="kpi-value" style="color:#16a34a">${resolved}</div></div>
      <div class="kpi"><div class="kpi-label">Active</div><div class="kpi-value" style="color:#2563eb">${active}</div></div>
      <div class="kpi"><div class="kpi-label">Avg Resolution</div><div class="kpi-value">${Math.round(avgTimeToResolveHours)}h</div></div>
      <div class="kpi"><div class="kpi-label">Team Members</div><div class="kpi-value">${users.length}</div></div>
      <div class="kpi"><div class="kpi-label">Overload Risk</div><div class="kpi-value" style="color:${overloadRiskColor}">${overloadedRisk.length}</div></div>
      <div class="kpi"><div class="kpi-label">High Reroutes</div><div class="kpi-value" style="color:${rerouteRiskColor}">${rerouteRisk.length}</div></div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>Headcount by Department</h3>
        <div class="chart-wrap"><canvas id="headcountChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Active Workload by Department</h3>
        <div class="chart-wrap"><canvas id="workloadChart"></canvas></div>
      </div>
      <div class="chart-card" style="grid-column: 1 / -1;">
        <h3>Top Performers — Resolved vs Active</h3>
        <div class="chart-wrap" style="height:260px"><canvas id="performersChart"></canvas></div>
      </div>
    </div>

    <div class="section">
      <h2>Team Performance by Department</h2>
      <table>
        <thead><tr><th>Department</th><th>Team Size</th><th>Resolved</th><th>Active</th><th>Tickets/Person</th><th>Avg Resolution</th></tr></thead>
        <tbody>
          ${teamStats
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
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Full Workforce (${workforce.length} people)</h2>
      <p style="margin:0 0 12px;color:#6b7280;font-size:13px">All active users — Managers, Developers, QA, HR, and Admins. Highlighted rows: overload (8+ active) or high reroutes (&gt;3).</p>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Access</th><th>Resolved</th><th>Active</th><th>Avg Time</th><th>Reroutes</th></tr></thead>
          <tbody>${workforceRows}</tbody>
        </table>
      </div>
    </div>

    ${
      overloadedRisk.length > 0
        ? `
    <div class="section">
      <h2>⚠️ Overload Risk</h2>
      <table>
        <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Active</th><th>Resolved (${periodDays}d)</th></tr></thead>
        <tbody>
          ${overloadedRisk
            .map(
              (e) =>
                `<tr><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.department)}</td><td>${escapeHtml(e.jobTitle)}</td><td>${e.active}</td><td>${e.resolved}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`
        : ''
    }

    ${
      rerouteRisk.length > 0
        ? `
    <div class="section">
      <h2>⚠️ High Reroute Count</h2>
      <table>
        <thead><tr><th>Employee</th><th>Department</th><th>Resolved</th><th>Reroutes</th></tr></thead>
        <tbody>
          ${rerouteRisk
            .map(
              (e) =>
                `<tr><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.department)}</td><td>${e.resolved}</td><td>${e.reroutes}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`
        : ''
    }

    <div class="ai-section">
      <h3>🤖 Analysis & Recommendations</h3>
      <p>${escapeHtml(aiAnalysis)}</p>
    </div>

    <div class="footer">Generated by Lumina HR Intelligence System</div>
  </div>
  <script>
    const chartData = ${chartConfigJson};
    const chartDefaults = { responsive: true, maintainAspectRatio: false };

    new Chart(document.getElementById('headcountChart'), {
      type: 'doughnut',
      data: {
        labels: chartData.headcount.map(d => d.label),
        datasets: [{ data: chartData.headcount.map(d => d.value), backgroundColor: chartData.headcount.map(d => d.color), borderWidth: 0 }]
      },
      options: { ...chartDefaults, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });

    new Chart(document.getElementById('workloadChart'), {
      type: 'bar',
      data: {
        labels: chartData.workload.map(d => d.label),
        datasets: [{ label: 'Active tickets', data: chartData.workload.map(d => d.value), backgroundColor: chartData.workload.map(d => d.color), borderRadius: 4 }]
      },
      options: { ...chartDefaults, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    new Chart(document.getElementById('performersChart'), {
      type: 'bar',
      data: {
        labels: chartData.performers.map(d => d.label),
        datasets: [
          { label: 'Resolved', data: chartData.performers.map(d => d.resolved), backgroundColor: '#16a34a', borderRadius: 4 },
          { label: 'Active', data: chartData.performers.map(d => d.active), backgroundColor: '#2563eb', borderRadius: 4 }
        ]
      },
      options: { ...chartDefaults, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  </script>
</body>
</html>`.trim();

  const markdown = `# HR Intelligence Report

**Period:** Last ${periodDays} days | **Generated:** ${new Date().toLocaleString()} | **Team:** ${users.length} active members

## Executive Summary
| Metric | Value |
|--------|-------|
| Resolved | ${resolved} |
| Active | ${active} |
| Avg Resolution | ${Math.round(avgTimeToResolveHours)}h |
| Overload Risk | ${overloadedRisk.length} employees |
| High Reroutes | ${rerouteRisk.length} employees |

## Team Performance
${teamStats.map((t) => `- **${t.department}**: ${t.teamSize} people, ${t.totalResolved} resolved, ${t.activeTickets} active, ${t.utilization} tickets/person`).join('\n')}

## Full Workforce
| Employee | Department | Role | Resolved | Active | Avg | Reroutes |
|----------|------------|------|----------|--------|-----|----------|
${workforce.map((e) => `| ${e.name} | ${e.department} | ${e.jobTitle} | ${e.resolved} | ${e.active} | ${e.avgResolutionHours}h | ${e.reroutes} |`).join('\n')}

${overloadedRisk.length > 0 ? `\n## ⚠️ Overload Risk\n${overloadedRisk.map((e) => `- ${e.name} (${e.department}): ${e.active} active`).join('\n')}` : ''}

${rerouteRisk.length > 0 ? `\n## ⚠️ High Reroute Count\n${rerouteRisk.map((e) => `- ${e.name}: ${e.reroutes} reroutes`).join('\n')}` : ''}

## Analysis & Recommendations
${aiAnalysis}
`.trim();

  const dateStr = new Date().toISOString().split('T')[0];

  return {
    html,
    markdown,
    filename: `hr-report-${dateStr}`,
  };
}

module.exports = { generateHrReport };
