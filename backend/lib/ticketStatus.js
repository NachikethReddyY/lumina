// DB ticket_status enum uses todo/abandoned; the API and UI use open/closed.
const API_TO_DB = { open: 'todo', closed: 'abandoned' };
const DB_TO_API = { todo: 'open', abandoned: 'closed' };

const TERMINAL_DB_STATUSES = ['resolved', 'abandoned'];

function toDbStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return API_TO_DB[normalized] || normalized;
}

function fromDbStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return DB_TO_API[normalized] || normalized;
}

function isTerminalStatus(status) {
  return TERMINAL_DB_STATUSES.includes(toDbStatus(status));
}

function mapTicketRow(row) {
  if (!row || row.status == null) return row;
  return { ...row, status: fromDbStatus(row.status) };
}

function mapTicketRows(rows) {
  return Array.isArray(rows) ? rows.map(mapTicketRow) : rows;
}

module.exports = {
  TERMINAL_DB_STATUSES,
  fromDbStatus,
  isTerminalStatus,
  mapTicketRow,
  mapTicketRows,
  toDbStatus,
};
