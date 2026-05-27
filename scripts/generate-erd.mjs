import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outSvg = resolve('docs/lumina-current-erd.svg');

const tables = [
  {
    name: 'Users',
    color: '#e8f1fb',
    x: 1070,
    y: 430,
    w: 600,
    rows: [
      ['PK', 'id', 'UUID'],
      ['UNIQUE, NN', 'email', 'VARCHAR(255)'],
      ['NULLABLE', 'password_hash', 'VARCHAR(255)'],
      ['NOT NULL', 'first_name', 'VARCHAR(255)'],
      ['NOT NULL', 'last_name', 'VARCHAR(255)'],
      ['NOT NULL', 'role', 'user_role enum'],
      ['NOT NULL', 'status', 'user_status enum'],
      ['NOT NULL', 'email_is_verified', 'BOOLEAN default false'],
      ['NULLABLE', 'avatar_url', 'VARCHAR(255)'],
      ['FK, NULL', 'approved_by', 'UUID'],
      ['NULLABLE', 'approved_at', 'TIMESTAMP'],
      ['FK, NULL', 'job_title_id', 'UUID'],
      ['NOT NULL', 'onboarding_completed', 'BOOLEAN default false'],
      ['NOT NULL', 'name_set', 'BOOLEAN default false'],
      ['NOT NULL', 'email_notifications', 'BOOLEAN default false'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
      ['NULLABLE', 'last_login_at', 'TIMESTAMP'],
    ],
  },
  {
    name: 'Tickets',
    color: '#ddf4df',
    x: 520,
    y: 80,
    w: 600,
    rows: [
      ['PK', 'id', 'UUID'],
      ['NOT NULL', 'title', 'VARCHAR(255)'],
      ['NOT NULL', 'description', 'TEXT'],
      ['FK, NOT NULL', 'category_id', 'UUID'],
      ['NOT NULL', 'type', 'ticket_type enum'],
      ['NOT NULL', 'priority', 'ticket_priority enum'],
      ['NOT NULL', 'status', 'ticket_status enum'],
      ['FK, NOT NULL', 'submitted_by', 'UUID'],
      ['NULLABLE', 'replication_steps', 'TEXT'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
      ['NULLABLE', 'closed_at', 'TIMESTAMP'],
      ['NOT NULL', 'metadata', "JSONB default '{}'"],
    ],
  },
  {
    name: 'Departments',
    color: '#e8f1fb',
    x: 1800,
    y: 80,
    w: 400,
    rows: [
      ['PK', 'id', 'UUID'],
      ['UNIQUE, NN', 'name', 'VARCHAR(100)'],
      ['NULLABLE', 'description', 'TEXT'],
      ['NOT NULL', 'is_active', 'BOOLEAN default true'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
    ],
  },
  {
    name: 'Job_Titles',
    color: '#e8f1fb',
    x: 1800,
    y: 260,
    w: 430,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'department_id', 'UUID'],
      ['NOT NULL', 'title', 'VARCHAR(255)'],
      ['NOT NULL', 'is_active', 'BOOLEAN default true'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
    ],
  },
  {
    name: 'Categories',
    color: '#ddf4df',
    x: 70,
    y: 520,
    w: 420,
    rows: [
      ['PK', 'id', 'UUID'],
      ['NOT NULL', 'name', 'VARCHAR(100)'],
      ['NULLABLE', 'description', 'TEXT'],
      ['FK, NOT NULL', 'created_by', 'UUID'],
      ['NOT NULL', 'is_active', 'BOOLEAN'],
    ],
  },
  {
    name: 'Ticket_Assignment',
    color: '#ddf4df',
    x: 500,
    y: 720,
    w: 520,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'ticket_id', 'UUID'],
      ['FK, NOT NULL', 'assigned_to', 'UUID'],
      ['FK, NOT NULL', 'assigned_by', 'UUID'],
      ['NOT NULL', 'is_active', 'BOOLEAN'],
      ['NOT NULL', 'assignment_role', 'assignment_role enum'],
      ['NOT NULL', 'assigned_at', 'TIMESTAMP default'],
    ],
  },
  {
    name: 'Satisfaction_Ratings',
    color: '#ddf4df',
    x: 1300,
    y: 86,
    w: 470,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, UNIQUE, NN', 'ticket_id', 'UUID'],
      ['FK, NOT NULL', 'rated_by', 'UUID'],
      ['NOT NULL', 'rating', 'INTEGER'],
      ['NULLABLE', 'comment', 'TEXT'],
    ],
  },
  {
    name: 'Audit_Logs',
    color: '#ddf4df',
    x: 2050,
    y: 450,
    w: 470,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NULL', 'ticket_id', 'UUID'],
      ['FK, NULL', 'actor_id', 'UUID'],
      ['NOT NULL', 'action', 'VARCHAR(100)'],
      ['NOT NULL', 'metadata', "JSONB default '{}'"],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
    ],
  },
  {
    name: 'Ticket_Comments',
    color: '#ddf4df',
    x: 70,
    y: 900,
    w: 460,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'ticket_id', 'UUID'],
      ['FK, NOT NULL', 'author_id', 'UUID'],
      ['NOT NULL', 'body', 'TEXT'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
      ['NULLABLE', 'deleted_at', 'TIMESTAMP'],
      ['FK, NULL', 'deleted_by', 'UUID'],
      ['NULLABLE', 'deletion_type', 'comment_deletion_type enum'],
    ],
  },
  {
    name: 'Oauth_Accounts',
    color: '#e8f1fb',
    x: 1960,
    y: 660,
    w: 500,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'user_id', 'UUID'],
      ['NOT NULL', 'provider', 'oauth_provider enum'],
      ['UNIQUE, NN', 'provider_user_id', 'VARCHAR(255)'],
      ['NULLABLE', 'access_token', 'TEXT'],
      ['NULLABLE', 'refresh_token', 'TEXT'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
    ],
  },
  {
    name: 'Routing_Decisions',
    color: '#ddf4df',
    x: 1140,
    y: 870,
    w: 530,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'ticket_id', 'UUID'],
      ['FK, NULL', 'assigned_admin_id', 'UUID'],
      ['NOT NULL', 'source', 'VARCHAR(50)'],
      ['NULLABLE', 'confidence', 'NUMERIC(4,2)'],
      ['NULLABLE', 'reasoning', 'TEXT'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
    ],
  },
  {
    name: 'Email_Verifications',
    color: '#e8f1fb',
    x: 1080,
    y: 1080,
    w: 470,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'user_id', 'UUID'],
      ['UNIQUE, NN', 'token', 'VARCHAR(255)'],
      ['NULLABLE', 'otp_hash', 'TEXT'],
      ['NULLABLE', 'otp_expires_at', 'TIMESTAMP'],
      ['NOT NULL', 'expires_at', 'TIMESTAMP'],
      ['NULLABLE', 'used_at', 'TIMESTAMP'],
    ],
  },
  {
    name: 'Password_Reset',
    color: '#e8f1fb',
    x: 530,
    y: 1080,
    w: 470,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'user_id', 'UUID'],
      ['UNIQUE, NN', 'token', 'VARCHAR(255)'],
      ['NULLABLE', 'otp_hash', 'TEXT'],
      ['NULLABLE', 'otp_expires_at', 'TIMESTAMP'],
      ['NOT NULL', 'expires_at', 'TIMESTAMP'],
      ['NULLABLE', 'used_at', 'TIMESTAMP'],
    ],
  },
  {
    name: 'Sessions',
    color: '#e8f1fb',
    x: 1080,
    y: 1320,
    w: 500,
    rows: [
      ['PK', 'id', 'UUID'],
      ['FK, NOT NULL', 'user_id', 'UUID'],
      ['UNIQUE, NN', 'session_token', 'VARCHAR(255)'],
      ['NOT NULL', 'expires_at', 'TIMESTAMP'],
      ['NOT NULL', 'created_at', 'TIMESTAMP default'],
      ['NOT NULL', 'user_agent', 'TEXT'],
      ['NOT NULL', 'ipaddress', 'TEXT'],
    ],
  },
];

const relationships = [
  ['Categories', 'Tickets', 'classifies', '1', 'many'],
  ['Users', 'Categories', 'creates', '1', 'many'],
  ['Departments', 'Job_Titles', 'contains', '1', 'many'],
  ['Job_Titles', 'Users', 'classifies', '1', 'many'],
  ['Users', 'Tickets', 'submits', '1', 'many'],
  ['Tickets', 'Ticket_Assignment', 'has', '1', 'many'],
  ['Users', 'Ticket_Assignment', 'assigned to/by', '1', 'many'],
  ['Tickets', 'Routing_Decisions', 'routes through', '1', 'many'],
  ['Users', 'Routing_Decisions', 'selected by', '1', 'many'],
  ['Tickets', 'Satisfaction_Ratings', 'rated by', '1', '0..1'],
  ['Users', 'Satisfaction_Ratings', 'provides', '1', 'many'],
  ['Users', 'Audit_Logs', 'performs', '0..1', 'many'],
  ['Tickets', 'Audit_Logs', 'has audit', '1', 'many'],
  ['Tickets', 'Ticket_Comments', 'has', '1', 'many'],
  ['Users', 'Ticket_Comments', 'writes/deletes', '1', 'many'],
  ['Users', 'Oauth_Accounts', 'authenticates', '1', 'many'],
  ['Users', 'Email_Verifications', 'verifies', '1', 'many'],
  ['Users', 'Password_Reset', 'requests', '1', 'many'],
  ['Users', 'Sessions', 'manages', '1', 'many'],
  ['Users', 'Users', 'approves', '0..1', 'many'],
];

const byName = new Map(tables.map((table) => [table.name, table]));
const rowH = 24;
const headerH = 28;
const width = 2580;
const height = 1540;

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function tableHeight(table) {
  return headerH + table.rows.length * rowH;
}

function center(table) {
  return [table.x + table.w / 2, table.y + tableHeight(table) / 2];
}

function anchor(from, to) {
  const [fx, fy] = center(from);
  const [tx, ty] = center(to);
  if (Math.abs(tx - fx) > Math.abs(ty - fy)) {
    return tx > fx
      ? [from.x + from.w, fy, to.x, ty]
      : [from.x, fy, to.x + to.w, ty];
  }
  return ty > fy
    ? [fx, from.y + tableHeight(from), tx, to.y]
    : [fx, from.y, tx, to.y + tableHeight(to)];
}

function connector([fromName, toName, label], index) {
  const from = byName.get(fromName);
  const to = byName.get(toName);
  if (fromName === toName) {
    const y = from.y + 90;
    const x1 = from.x + from.w;
    const x2 = from.x + from.w + 70;
    return `
      <path d="M ${x1} ${y} C ${x2} ${y}, ${x2} ${from.y - 32}, ${from.x + from.w * 0.66} ${from.y - 32} S ${from.x + from.w * 0.48} ${from.y}, ${from.x + from.w * 0.48} ${from.y}" class="rel"/>
      <text x="${x2 + 4}" y="${from.y - 38}" class="label">${esc(label)}</text>`;
  }

  const [x1, y1, x2, y2] = anchor(from, to);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const offset = ((index % 3) - 1) * 12;
  const horizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);
  const c1x = horizontal ? midX : x1;
  const c1y = horizontal ? y1 + offset : midY;
  const c2x = horizontal ? midX : x2;
  const c2y = horizontal ? y2 + offset : midY;
  const lx = horizontal ? midX : midX + 8;
  const ly = horizontal ? midY - 7 + offset : midY;

  return `
    <path d="M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}" class="rel"/>
    <circle cx="${x1}" cy="${y1}" r="4.5" class="end"/>
    <circle cx="${x2}" cy="${y2}" r="4.5" class="end"/>
    <text x="${lx}" y="${ly}" class="label">${esc(label)}</text>`;
}

function renderTable(table) {
  const h = tableHeight(table);
  const c1 = 152;
  const c2 = 170;
  const rows = table.rows.map((row, i) => {
    const y = table.y + headerH + i * rowH;
    const keyClass = row[0].includes('PK') ? 'key pk' : row[0].includes('FK') ? 'key fk' : 'key';
    return `
      <text x="${table.x + c1 / 2}" y="${y + 17}" class="${keyClass}" text-anchor="middle">${esc(row[0])}</text>
      <text x="${table.x + c1 + 8}" y="${y + 17}" class="cell">${esc(row[1])}</text>
      <text x="${table.x + c1 + c2 + 8}" y="${y + 17}" class="cell">${esc(row[2])}</text>`;
  }).join('');

  return `
    <g class="table">
      <rect x="${table.x}" y="${table.y}" width="${table.w}" height="${h}" rx="7" fill="#fff" stroke="#222" stroke-width="1.4"/>
      <path d="M ${table.x} ${table.y + headerH} H ${table.x + table.w}" stroke="#222" stroke-width="1"/>
      <rect x="${table.x}" y="${table.y}" width="${table.w}" height="${headerH}" rx="7" fill="${table.color}" stroke="#222" stroke-width="1.4"/>
      <path d="M ${table.x} ${table.y + headerH} H ${table.x + table.w}" stroke="#222" stroke-width="1"/>
      <path d="M ${table.x + c1} ${table.y + headerH} V ${table.y + h}" stroke="#222" stroke-width="1"/>
      <path d="M ${table.x + c1 + c2} ${table.y + headerH} V ${table.y + h}" stroke="#222" stroke-width="1"/>
      <text x="${table.x + table.w / 2}" y="${table.y + 19}" class="title" text-anchor="middle">${esc(table.name)}</text>
      ${rows}
    </g>`;
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    svg { background: #fbfcfd; }
    .title { font: 700 14px Georgia, 'Times New Roman', serif; fill: #17251c; }
    .cell { font: 12.5px Georgia, 'Times New Roman', serif; fill: #161616; }
    .key { font: 700 10.5px Georgia, 'Times New Roman', serif; fill: #2d2d2d; }
    .pk { fill: #e11d2f; }
    .fk { fill: #f47b20; }
    .rel { fill: none; stroke: #606b76; stroke-width: 1.25; }
    .end { fill: #fbfcfd; stroke: #606b76; stroke-width: 1.25; }
    .label { font: 700 10.5px Georgia, 'Times New Roman', serif; fill: #3d454d; }
    .card { font: 10px Georgia, 'Times New Roman', serif; fill: #4c5660; }
    .note { font: 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: #4b5563; }
    .heading { font: 700 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: #111827; }
  </style>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcfd"/>
  <text x="58" y="32" class="heading">Lumina Normalized ERD Design</text>
  <text x="58" y="54" class="note">3NF update: departments/job titles extracted, audit ticket FK added, routing decisions separated, comments retained, and removed legacy chat entities.</text>
  <g class="relationships">
    ${relationships.map(connector).join('\n')}
  </g>
  <g class="tables">
    ${tables.map(renderTable).join('\n')}
  </g>
</svg>
`;

mkdirSync(dirname(outSvg), { recursive: true });
writeFileSync(outSvg, svg);
console.log(outSvg);
