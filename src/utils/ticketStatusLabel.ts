export function formatTicketStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'open') return 'To Do';
  if (normalized === 'resolved') return 'Finished';
  if (normalized === 'closed' || normalized === 'abandoned') return 'Abandoned';
  if (normalized === 'todo') return 'To Do';
  return normalized.replace(/_/g, ' ');
}
