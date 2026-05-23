/** Ticket types for a software company (no hardware). */
export const TICKET_TYPES = ['software', 'bug', 'incident'] as const;

export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  software: 'Software',
  bug: 'Bug',
  incident: 'Incident',
};
