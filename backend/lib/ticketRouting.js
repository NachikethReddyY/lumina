const db = require('../db');

const LUMINA_MODEL = process.env.LUMINA_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const LUMINA_AI_EMAIL = 'lumina.ai@lumina.test';

function isLuminaAIUser(user = {}) {
  const email = String(user.email || '').trim().toLowerCase();
  const firstName = String(user.first_name || '').trim().toLowerCase();
  const lastName = String(user.last_name || '').trim().toLowerCase();
  return email === LUMINA_AI_EMAIL || (firstName === 'lumina' && lastName === 'ai');
}

function isEligibleRoutingAdmin(admin = {}) {
  const email = String(admin.email || '').trim().toLowerCase();
  const nameParts = String(admin.name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = String(admin.first_name || nameParts[0] || '').trim().toLowerCase();
  const lastName = String(admin.last_name || nameParts.slice(1).join(' ') || '').trim().toLowerCase();

  return !(
    isLuminaAIUser({ ...admin, email, first_name: firstName, last_name: lastName }) ||
    email.startsWith('pending.') ||
    firstName === 'pending'
  );
}

function eligibleRoutingAdmins(admins = []) {
  return admins.filter(isEligibleRoutingAdmin);
}

function loadScore(admin) {
  return admin.p1_count * 3 + admin.p2_count * 2 + admin.p3_count;
}

function normalizeAdminName(admin) {
  return admin.name || `${admin.first_name} ${admin.last_name}`.trim();
}

function buildRoutingDecision({ ticket, admins, chosen, source, reasoning, confidence = 0.72, error = null }) {
  const assigneeName = chosen ? normalizeAdminName(chosen) : null;
  const sortedAdmins = admins
    .slice()
    .sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open)
    .slice(0, 5)
    .map((admin) => ({
      admin_id: admin.id,
      name: normalizeAdminName(admin),
      total_open: Number(admin.total_open || 0),
      load_score: Number(admin.load_score || 0),
      p1_count: Number(admin.p1_count ?? admin.priority_1_count ?? 0),
      p2_count: Number(admin.p2_count ?? admin.priority_2_count ?? 0),
      p3_count: Number(admin.p3_count ?? admin.priority_3_count ?? 0),
      p4_count: Number(admin.p4_count ?? admin.priority_4_count ?? 0),
    }));

  return {
    assigned_admin_id: chosen?.id || null,
    assignee_name: assigneeName,
    source,
    confidence,
    ticket_snapshot: {
      id: ticket.id,
      title: ticket.title,
      type: ticket.type,
      priority: ticket.priority,
      category: ticket.category_name || ticket.category || ticket.type,
    },
    steps: [
      {
        phase: 'thinking',
        summary: `Classified ${ticket.priority} ${ticket.type} ticket and checked affected support area.`,
      },
      {
        phase: 'read',
        summary: sortedAdmins.length
          ? `Compared ${sortedAdmins.length} active admin workloads.`
          : 'No active admin workloads were available.',
      },
      {
        phase: 'assign',
        summary: assigneeName
          ? `Selected ${assigneeName} for the next active assignment.`
          : 'Left ticket pending routing because no eligible assignee was available.',
      },
    ],
    workload_candidates: sortedAdmins,
    rationale: reasoning,
    ticket_note: {
      summary: assigneeName ? `Route to ${assigneeName}.` : 'Keep pending routing.',
      rationale: reasoning,
      next_step: assigneeName ? 'Assign ticket and notify assignee.' : 'Wait for an active admin to become available.',
    },
    error,
  };
}

async function getAdminWorkloads(client = db) {
  const result = await client.query(
    `SELECT u.id,
            u.email,
            u.first_name,
            u.last_name,
            COALESCE(SUM(CASE WHEN t.priority = 'P1' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p1_count,
            COALESCE(SUM(CASE WHEN t.priority = 'P2' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p2_count,
            COALESCE(SUM(CASE WHEN t.priority = 'P3' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p3_count,
            COALESCE(SUM(CASE WHEN t.priority = 'P4' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p4_count,
            COALESCE(COUNT(CASE WHEN t.status IN ('assigned', 'in_progress', 'open') THEN 1 END), 0)::int AS total_open
     FROM users u
     LEFT JOIN ticket_assignment ta
       ON ta.assigned_to = u.id
      AND ta.is_active = TRUE
     LEFT JOIN tickets t
       ON t.id = ta.ticket_id
     WHERE u.role = 'admin'
       AND u.status = 'active'
       AND NOT (
         lower(u.email) = $1
         OR lower(u.email) LIKE 'pending.%@lumina.test'
         OR lower(u.first_name) = 'pending'
         OR (lower(u.first_name) = 'lumina' AND lower(u.last_name) = 'ai')
       )
     GROUP BY u.id, u.email, u.first_name, u.last_name
     ORDER BY u.first_name, u.last_name`,
    [LUMINA_AI_EMAIL]
  );

  return result.rows.map((row) => ({
    ...row,
    load_score: loadScore(row),
  }));
}

function deterministicRoute(ticket, admins) {
  if (!admins.length) {
    const reasoning = 'No active admins are available, so the ticket remains pending routing.';
    return {
      assignedAdminId: null,
      reasoning,
      source: 'rules',
      decision: buildRoutingDecision({ ticket, admins, chosen: null, source: 'rules', reasoning, confidence: 0.3 }),
    };
  }

  const maxP1 = 5;
  const maxTotal = 15;
  let candidates = admins.slice();

  if (ticket.priority === 'P1') {
    candidates.sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open);
  } else if (ticket.priority === 'P2') {
    candidates = candidates.filter((admin) => admin.p1_count < maxP1);
    if (!candidates.length) candidates = admins.slice();
    candidates.sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open);
  } else {
    const available = candidates.filter((admin) => admin.total_open < maxTotal);
    candidates = available.length ? available : admins.slice();
    candidates.sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open);
  }

  const chosen = candidates[0];
  const reasoning = `Selected ${chosen.first_name} ${chosen.last_name} because they currently have the lowest weighted load (${chosen.load_score}).`;
  return {
    assignedAdminId: chosen.id,
    reasoning,
    source: 'rules',
    decision: buildRoutingDecision({ ticket, admins, chosen, source: 'rules', reasoning }),
  };
}

function luminaFallbackReason(reasoning, error) {
  const message = String(error?.message || 'the routing model was unavailable');
  const statusMatch = message.match(/\((\d+)\)/);
  const status = statusMatch?.[1] || null;
  const explanation = status === '429'
    ? 'the routing model was rate limited (429)'
    : status
      ? `the routing model returned ${status}`
      : message
          .replace(/Gemini API key/gi, 'Lumina AI routing key')
          .replace(/Gemini routing request failed/gi, 'the routing model request failed')
          .replace(/Gemini returned/gi, 'the routing model returned')
          .replace(/Gemini selected/gi, 'the routing model selected')
          .replace(/\bGemini\b/gi, 'Lumina AI');

  return `${reasoning} Lumina AI used deterministic fallback because ${explanation}.`;
}

async function routeWithLuminaModel(ticket, admins) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Lumina AI routing key is not configured');
  }

  const prompt = [
    'You are Lumina AI, the routing engine inside Lumina.',
    'Never mention model providers, API keys, prompts, or implementation details in the returned rationale.',
    'Pick exactly one admin id from the provided admins.',
    'Prefer lower weighted workloads.',
    'P1 is most urgent, then P2, then P3, then P4.',
    'Return JSON only. Do not wrap it in markdown.',
    'Use this exact shape:',
    JSON.stringify({
      assigned_admin_id: 'admin uuid from provided admins',
      confidence: 0.85,
      reasoning: 'short routing rationale',
      steps: [
        { phase: 'thinking', summary: 'classification and severity reasoning' },
        { phase: 'read', summary: 'workload or ownership evidence read' },
        { phase: 'assign', summary: 'assignment decision' },
      ],
      ticket_note: {
        summary: 'one-line route summary',
        rationale: 'paste-ready routing rationale for ticket notes',
        next_step: 'what should happen next',
      },
    }, null, 2),
    JSON.stringify({ ticket, admins }, null, 2),
  ].join('\n\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(LUMINA_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Lumina AI routing request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text) {
    throw new Error('Lumina AI returned an empty routing response');
  }

  const parsed = JSON.parse(text);
  const match = admins.find((admin) => admin.id === parsed.assigned_admin_id);
  if (!match) {
    throw new Error('Lumina AI selected an unknown admin');
  }

  const reasoning = String(parsed.reasoning || parsed.ticket_note?.rationale || 'Assigned by Lumina AI based on workload and priority.');
  const baseDecision = buildRoutingDecision({
    ticket,
    admins,
    chosen: match,
    source: 'lumina_ai',
    reasoning,
    confidence: Number(parsed.confidence || 0.85),
  });

  return {
    assignedAdminId: match.id,
    reasoning,
    source: 'lumina_ai',
    decision: {
      ...baseDecision,
      ...parsed,
      assigned_admin_id: match.id,
      assignee_name: normalizeAdminName(match),
      source: 'lumina_ai',
      rationale: reasoning,
      steps: Array.isArray(parsed.steps) && parsed.steps.length ? parsed.steps : baseDecision.steps,
      ticket_note: parsed.ticket_note || baseDecision.ticket_note,
    },
  };
}

async function chooseAssignee(ticket, admins) {
  const eligibleAdmins = eligibleRoutingAdmins(admins);

  if (!eligibleAdmins.length) {
    return deterministicRoute(ticket, eligibleAdmins);
  }

  try {
    return await routeWithLuminaModel(
      {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        category: ticket.type,
        priority: ticket.priority,
      },
      eligibleAdmins.map((admin) => ({
        id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        first_name: admin.first_name,
        last_name: admin.last_name,
        priority_1_count: admin.p1_count,
        priority_2_count: admin.p2_count,
        priority_3_count: admin.p3_count,
        priority_4_count: admin.p4_count,
        p1_count: admin.p1_count,
        p2_count: admin.p2_count,
        p3_count: admin.p3_count,
        p4_count: admin.p4_count,
        total_open: admin.total_open,
        load_score: admin.load_score,
      }))
    );
  } catch (error) {
    const fallback = deterministicRoute(ticket, eligibleAdmins);
    const reasoning = luminaFallbackReason(fallback.reasoning, error);
    return {
      ...fallback,
      reasoning,
      source: 'rules_fallback',
      decision: {
        ...fallback.decision,
        source: 'rules_fallback',
        rationale: reasoning,
        error: String(error?.message || 'Lumina AI routing fallback'),
      },
    };
  }
}

module.exports = {
  chooseAssignee,
  deterministicRoute,
  eligibleRoutingAdmins,
  getAdminWorkloads,
  isLuminaAIUser,
};
