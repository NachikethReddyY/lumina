import { Activity, type LucideIcon } from 'lucide-react';

export type TimelineTone = 'green' | 'red' | 'yellow' | 'purple' | 'blue' | 'gray';

export type TimelineEvent = {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  time: string;
  occurredAt: number;
  order: number;
  tone: TimelineTone;
};

export type TicketTimelinePanelProps = {
  events: TimelineEvent[];
  loading: boolean;
};

export function TicketTimelinePanel({ events, loading }: TicketTimelinePanelProps) {
  return (
    <section className="th-side-log-card th-side-activity-log" aria-label="Activity log">
      <header>
        <span><Activity size={15} /> Activity Log</span>
        <small>{events.length} events</small>
      </header>
      {events.length > 0 || loading ? (
        <>
          {loading && !events.length ? (
            <div className="th-activity-loading" aria-label="Loading ticket activity">
              <span />
              <span />
              <span />
            </div>
          ) : null}
          <div className="th-activity-list">
            {events.map((event) => {
              const Icon = event.icon;
              return (
                <div className={`th-activity-item tone-${event.tone}`} key={event.id}>
                  <span className="th-activity-icon"><Icon size={15} /></span>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                  </div>
                  <time>{event.time}</time>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="th-side-empty">Select a ticket to see activity.</p>
      )}
    </section>
  );
}

export default TicketTimelinePanel;
