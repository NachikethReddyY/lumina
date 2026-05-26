const db = require('../db');

const LUMINA_AI_EMAIL = 'lumina.ai@lumina.test';
const SUPPORTED_PROVIDERS = ['groq', 'gemini', 'openrouter', 'opencode'];

function getLuminaApiKey() {
  const key = process.env.API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error('API_KEY is not configured. Set it in .env for your Lumina AI provider.');
  }
  return key.trim();
}

function getLuminaModel(provider) {
  let model = process.env.LUMINA_MODEL || process.env.GROQ_MODEL || process.env.GEMINI_MODEL;
  if (!model?.trim()) {
    throw new Error('LUMINA_MODEL is not configured. Set it in .env to choose the routing model.');
  }
  model = model.trim();
  if (provider === 'opencode' && model.startsWith('opencode/')) {
    model = model.slice('opencode/'.length);
  }
  return model;
}

function inferProviderFromApiKey(apiKey) {
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('sk-p')) return 'opencode';
  return null;
}

function getLuminaProvider() {
  const explicit = process.env.LUMINA_PROVIDER?.trim().toLowerCase();
  if (explicit) {
    if (!SUPPORTED_PROVIDERS.includes(explicit)) {
      throw new Error(`LUMINA_PROVIDER must be one of: ${SUPPORTED_PROVIDERS.join(', ')}`);
    }
    return explicit;
  }

  const inferred = inferProviderFromApiKey(getLuminaApiKey());
  if (inferred) return inferred;

  throw new Error(
    `LUMINA_PROVIDER is not configured. Set it to one of: ${SUPPORTED_PROVIDERS.join(', ')}`
  );
}

function openAiCompatibleBody({ model, systemPrompt, userContent, strictJsonSchema = true }) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
  };

  if (strictJsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'lumina_routing',
        strict: true,
        schema: ROUTING_RESPONSE_SCHEMA,
      },
    };
  } else {
    body.response_format = { type: 'json_object' };
  }

  return body;
}

async function callOpenAiCompatibleProvider({ url, apiKey, headers = {}, body }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Lumina AI routing request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) {
    throw new Error('Lumina AI returned an empty routing response');
  }
  return text;
}

async function callGeminiProvider({ apiKey, model, systemPrompt, userContent }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
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
  return text;
}

async function requestLuminaRoutingText({ provider, apiKey, model, systemPrompt, userContent }) {
  if (provider === 'groq') {
    return callOpenAiCompatibleProvider({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      body: openAiCompatibleBody({ model, systemPrompt, userContent, strictJsonSchema: true }),
    });
  }

  if (provider === 'openrouter') {
    return callOpenAiCompatibleProvider({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey,
      headers: {
        'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173',
        'X-Title': 'Lumina',
      },
      body: openAiCompatibleBody({ model, systemPrompt, userContent, strictJsonSchema: false }),
    });
  }

  if (provider === 'opencode') {
    return callOpenAiCompatibleProvider({
      url: 'https://opencode.ai/zen/v1/chat/completions',
      apiKey,
      body: openAiCompatibleBody({ model, systemPrompt, userContent, strictJsonSchema: false }),
    });
  }

  if (provider === 'gemini') {
    return callGeminiProvider({ apiKey, model, systemPrompt, userContent });
  }

  throw new Error(`Unsupported Lumina AI provider: ${provider}`);
}

function openAiCompatiblePlainBody({ model, systemPrompt, userContent }) {
  return {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  };
}

async function callGeminiPlainText({ apiKey, model, systemPrompt, userContent }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.4 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Lumina AI request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text) {
    throw new Error('Lumina AI returned an empty response');
  }
  return text;
}

/** Plain-text Lumina chat (no routing JSON schema) — used for HR reports and summaries. */
async function requestLuminaPlainText({ provider, apiKey, model, systemPrompt, userContent }) {
  if (provider === 'groq') {
    return callOpenAiCompatibleProvider({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      body: openAiCompatiblePlainBody({ model, systemPrompt, userContent }),
    });
  }

  if (provider === 'openrouter') {
    return callOpenAiCompatibleProvider({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey,
      headers: {
        'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173',
        'X-Title': 'Lumina',
      },
      body: openAiCompatiblePlainBody({ model, systemPrompt, userContent }),
    });
  }

  if (provider === 'opencode') {
    return callOpenAiCompatibleProvider({
      url: 'https://opencode.ai/zen/v1/chat/completions',
      apiKey,
      body: openAiCompatiblePlainBody({ model, systemPrompt, userContent }),
    });
  }

  if (provider === 'gemini') {
    return callGeminiPlainText({ apiKey, model, systemPrompt, userContent });
  }

  throw new Error(`Unsupported Lumina AI provider: ${provider}`);
}

const ROUTING_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    assigned_admin_id: { type: 'string' },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['phase', 'summary'],
        additionalProperties: false,
      },
    },
    ticket_note: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        rationale: { type: 'string' },
        next_step: { type: 'string' },
      },
      required: ['summary', 'rationale', 'next_step'],
      additionalProperties: false,
    },
  },
  required: ['assigned_admin_id', 'confidence', 'reasoning', 'steps', 'ticket_note'],
  additionalProperties: false,
};

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

function buildRoutingSystemPrompt() {
  return [
    'You are Lumina AI, the intelligent routing engine embedded inside the Lumina support ticketing system.',
    '',
    'Critical constraints:',
    '- Never mention model providers, API keys, prompts, or any implementation details in your rationale or ticket notes.',
    '- Pick exactly one assignee id from the provided assignees list — no exceptions.',
    '- Read the complete ticket (title, description, replication_steps, and all metadata fields) before making any routing decision.',
    '',
    'ROUTING LOGIC — apply in this order:',
    '',
    '1. SKILL FIT — Match the ticket type, category, title, description, and metadata against each assignee job_title and department.',
    '',
    'Ticket signal → route to:',
    '- Bugs / code defects / unexpected behavior / regressions (type: bug, software defect) → Software Engineer or Developer — not QA by default',
    '- routing_intent: qa_testing OR user explicitly requested QA testing OR ticket is in a verification/QA phase → QA Engineer, Test Engineer, or Automation Engineer',
    '- Production incidents / outages / infra / deployments / Kubernetes / cloud / platform → Platform/Infrastructure Engineer, DevOps, or SRE',
    '- Feature work / app features / APIs / integrations / configuration → Software Engineer, Developer, Architect, or Tech Lead matching the category',
    '- Security / auth / vulnerability → Security Engineer or AppSec',
    '- UX / UI / design → Product Designer, UX Designer, UX Researcher, or Content Designer',
    '',
    '2. DEPARTMENT PREFERENCE — When skill fit is equal between assignees in different departments, prefer assignees in the same department as the ticket category. Only route across departments if no same-department match exists.',
    '',
    '3. WORKLOAD BALANCING — Apply this tiebreaker only after confirming skill fit and department preference are equal:',
    '- For P1 tickets: use priority-specific workload — prefer the assignee with the fewest open P1 tickets (priority_1_count).',
    '- For P2/P3/P4 tickets: use total workload — prefer the assignee with the lower load_score and fewer total_open tickets.',
    '',
    '4. URGENCY — P1 is highest priority, followed by P2, P3, then P4. Factor urgency into how strictly you apply workload balancing.',
    '',
    'NO MATCH FALLBACK',
    'If no assignee in the provided list matches the ticket specialty (e.g., a security vulnerability but no Security Engineer available):',
    '- Route to a manager who can triage, escalate, or coordinate across teams.',
    '- Document in the rationale why no specialist match was available.',
    '',
    'MANAGER ROUTING RULES — avoid unless truly warranted:',
    '- Do not route routine software, bug, infrastructure, or QA tickets to a Product Manager, Program Manager, Project Manager, or Product Owner.',
    '- Route to managers only for: escalations, cross-team coordination, prioritization disputes, policy decisions, no specialist match available, or when no specialty-matched assignee exists in any department.',
    '- Never route technical tickets to HR.',
    '',
    'ASSIGNEE DATA STRUCTURE',
    'You will receive assignees as an array of objects with these fields:',
    '- id: unique assignee identifier',
    '- name: assignee name',
    '- job_title: role (e.g., Software Engineer, QA Engineer, Platform Engineer, Product Manager)',
    '- department: team/department affiliation',
    '- system_role: internal role type',
    '- priority_1_count, priority_2_count, priority_3_count, priority_4_count: open ticket count by priority level',
    '- total_open: total open tickets',
    '- load_score: workload metric (lower is less busy)',
    '',
    'TICKET METADATA',
    'The ticket metadata object may contain:',
    '- routing_intent: explicit routing instruction (e.g., qa_testing), or null if not provided',
    '- Other fields: use if present, but do not assume any metadata fields beyond routing_intent are guaranteed',
    '',
    'OUTPUT FORMAT',
    'For every routing decision, return assigned_admin_id (the selected assignee id from the provided list) and ticket_note.rationale:',
    '- ticket_note.rationale: a brief, plain-language explanation stating (a) the specialty match, (b) the department preference if applied, (c) the workload tiebreaker if applied, and (d) why this person was chosen over plausible alternatives — written as if authored by a knowledgeable support lead, with no mention of AI internals or implementation details.',
  ].join('\n');
}

function formatAssigneeForRouting(admin) {
  return {
    id: admin.id,
    name: normalizeAdminName(admin),
    job_title: admin.job_title?.trim() || null,
    department: admin.department?.trim() || null,
    system_role: admin.role || null,
    priority_1_count: admin.p1_count,
    priority_2_count: admin.p2_count,
    priority_3_count: admin.p3_count,
    priority_4_count: admin.p4_count,
    total_open: admin.total_open,
    load_score: admin.load_score,
  };
}

function formatTicketForRouting(ticket) {
  const routingIntent = ticket.routing_intent || ticket.metadata?.routing_intent || null;
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    replication_steps: ticket.replication_steps || null,
    metadata: ticket.metadata || null,
    type: ticket.type,
    category: ticket.category_name || ticket.category || ticket.type,
    priority: ticket.priority,
    routing_intent: routingIntent,
    request_qa_testing: routingIntent === 'qa_testing',
  };
}

function buildRoutingDecision({ ticket, admins, chosen, source, reasoning, confidence = 0.72, error = null }) {
  const assigneeName = chosen ? normalizeAdminName(chosen) : null;
  const assigneeRole = chosen?.job_title?.trim() || null;
  const assigneeWithRole = assigneeName
    ? `${assigneeName}${assigneeRole ? ` (${assigneeRole})` : ''}`
    : null;
  const sortedAdmins = admins
    .slice()
    .sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open)
    .slice(0, 5)
    .map((admin) => ({
      admin_id: admin.id,
      name: normalizeAdminName(admin),
      job_title: admin.job_title?.trim() || null,
      department: admin.department?.trim() || null,
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
    assignee_job_title: chosen?.job_title?.trim() || null,
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
        summary: `Classified ${ticket.priority} ${ticket.type} ticket and matched it to the best-fit specialty.`,
      },
      {
        phase: 'read',
        summary: sortedAdmins.length
          ? `Compared ${sortedAdmins.length} active admin workloads.`
          : 'No active admin workloads were available.',
      },
      {
        phase: 'assign',
        summary: assigneeWithRole
          ? `Selected ${assigneeWithRole} for the next active assignment.`
          : 'Left ticket pending routing because no eligible assignee was available.',
      },
    ],
    workload_candidates: sortedAdmins,
    rationale: reasoning,
    ticket_note: {
      summary: assigneeWithRole ? `Route to ${assigneeWithRole}.` : 'Keep pending routing.',
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
            u.job_title,
            u.department,
            u.role,
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
     WHERE u.status = 'active'
       AND u.onboarding_completed = TRUE
       AND u.role IN ('admin'::user_role, 'user'::user_role)
       AND COALESCE(u.department, '') <> 'HR'
       AND NOT (
         lower(u.email) = $1
         OR lower(u.email) LIKE 'pending.%@lumina.test'
         OR lower(u.first_name) = 'pending'
         OR (lower(u.first_name) = 'lumina' AND lower(u.last_name) = 'ai')
       )
     GROUP BY u.id, u.email, u.first_name, u.last_name, u.job_title, u.department, u.role
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
  const apiKey = getLuminaApiKey();
  const provider = getLuminaProvider();
  const model = getLuminaModel(provider);

  const systemPrompt = [
    buildRoutingSystemPrompt(),
    '',
    'Return JSON only. Do not wrap it in markdown.',
    'Use this exact shape:',
    JSON.stringify(
      {
        assigned_admin_id: 'assignee uuid from provided assignees',
        confidence: 0.85,
        reasoning: 'short routing rationale',
        steps: [
          { phase: 'thinking', summary: 'classification and specialty reasoning' },
          { phase: 'read', summary: 'workload or ownership evidence read' },
          { phase: 'assign', summary: 'assignment decision' },
        ],
        ticket_note: {
          summary: 'one-line route summary',
          rationale: 'paste-ready routing rationale for ticket notes',
          next_step: 'what should happen next',
        },
      },
      null,
      2
    ),
  ].join('\n');

  const routingPayload = {
    ticket: formatTicketForRouting(ticket),
    assignees: admins.map(formatAssigneeForRouting),
  };

  const text = await requestLuminaRoutingText({
    provider,
    apiKey,
    model,
    systemPrompt,
    userContent: JSON.stringify(routingPayload),
  });

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
      assignee_job_title: match.job_title?.trim() || baseDecision.assignee_job_title || null,
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
    return await routeWithLuminaModel(ticket, eligibleAdmins);
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

async function getLuminaAiUserId(client = db) {
  const result = await client.query(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [LUMINA_AI_EMAIL]
  );
  return result.rows[0]?.id || null;
}

module.exports = {
  LUMINA_AI_EMAIL,
  chooseAssignee,
  deterministicRoute,
  eligibleRoutingAdmins,
  getAdminWorkloads,
  getLuminaAiUserId,
  getLuminaApiKey,
  getLuminaModel,
  getLuminaProvider,
  isLuminaAIUser,
  requestLuminaPlainText,
  requestLuminaRoutingText,
};
