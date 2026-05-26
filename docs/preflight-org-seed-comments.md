# Preflight Plan: Seed Data, Org Visibility, Comments, Light-Mode UI

**Date:** 2026-05-26  
**Input type:** B (chat description) + partial Type C (existing codebase)

## Goal

1. Rebuild seed SQL with Jan–May ticket history, assignments to **Developers** and **QA** (not only admins).
2. Replace dashboard chart **Approval Wait Time** → **Amount of time to resolve issues**, move to **top** of charts.
3. Enforce **light mode** across app; redesign **Delete User** modal (currently dark inline styles).
4. **Org visibility:** all authenticated active users can see organization tickets and who is assigned.
5. **Comments:** soft-delete with attribution — author delete vs admin takedown messages.

---

## Foundations

| # | Area | Decision | Notes |
|---|------|----------|-------|
| 1 | Database Schema | Extend `ticket_comments` with soft-delete columns; seed in dedicated SQL file | `deleted_at`, `deleted_by`, `deletion_reason` enum (`author` \| `admin`). Keep body for audit or replace with sentinel in API. Rebuild `SEED_TICKETS_*.sql` + assignment rows for dev/qa users from DDL user seeds. |
| 2 | TypeScript Types | Extend `ApiComment` in `apiClient.ts` | Add `is_deleted`, `deleted_by_name`, `deletion_type`, optional `body` placeholder. |
| 3 | Validation Strategy | Server-side only (existing pattern) | Express routes validate comment body length; reject edits on deleted comments. No new client validation library. |
| 4 | Routing Structure | No new routes; extend existing | `GET/POST/DELETE /tickets/:id/comments`; ticket list uses `scope=org` for all active users. Optional: add "Organization" nav link for non-admin roles. |
| 5 | Auth Flow | **Expand read scope** — breaking change | `canViewTicket` + `getTicketListScope`: all `status=active` users get `scope: org` read. Mutations unchanged (assignee/admin only). Comments: author soft-delete; admin soft-delete with label. |
| 6 | CSS Methodology | Tailwind v4 + CSS variables (`index.css` @theme) | Remove inline dark gradients from `DeleteUserModal`. Use `var(--color-surface-card)`, hairlines, Playfair headings. Audit `SuperAdminDashboard.css` for dark overrides. |
| 7 | UI Framework | Existing: custom components + Recharts + framer-motion | No shadcn migration. Modal uses shared `.nt-modal` from `Dashboard.css`. |
| 8 | Client–Server Communication | REST via `apiClient.ts` | `ticketsApi.list({ scope: 'org' })`, `commentsApi` CRUD. |
| 9 | Folder Structure | Match repo | `backend/db/`, `backend/routes/comments.js`, `backend/lib/ticketPermissions.js`, `src/components/DeleteUserModal.tsx`, `src/pages/SuperAdminDashboard.tsx`. |

---

## Implementation Phases

### Phase A — Seed data rebuild

**Files:** `backend/db/SEED_TICKETS_ORG.sql` (new, replaces/consolidates `SEED_TICKETS_CLOSURE_ANALYTICS.sql`), update `DDL.sql` reference if needed.

- Span **Jan 1 – May 26, 2026** (align with current date in user env).
- ~15–20 tickets/month, mix P1–P4, statuses: open, assigned, in_progress, resolved, closed.
- `ticket_assignment` rows:
  - `assignment_role = 'qa'` → users in QA department
  - `assignment_role = 'developer'` → users in Developers department
- Use existing seed emails from DDL (`engineer.*`, `qa.*`, `test.*`, etc.).
- Set `closed_at` for resolved/closed; varied resolution hours for analytics chart.
- Idempotent: `WHERE NOT EXISTS` or truncate seed marker table.

### Phase B — Dashboard chart

**File:** `src/pages/SuperAdminDashboard.tsx`

- Remove or demote `pendingAgeBuckets` / "Approval Wait Time" chart.
- Add `buildResolutionTimeByMonth(tickets)` — avg hours to resolve per month (Jan–May), only closed/resolved.
- Title: **"Amount of time to resolve issues"**
- Place as **first** chart in `charts-grid` (before Ticket Volume).
- Show for HR view and optionally all admin overview.

### Phase C — Light mode + Delete User modal

**Files:** `DeleteUserModal.tsx`, `Dashboard.css`, `SuperAdminDashboard.css`, spot-check `index.css`

- Delete modal: white card, red accent border-left, ink text, no `rgba(31,34,40)` gradients.
- Use `Button` component variants instead of raw styled buttons.
- Confirm `color-scheme: only light` on dashboard pages.
- frontend-design direction: editorial cream (existing `--color-canvas`), Playfair Display headings, refined danger state.

### Phase D — Org visibility (all users)

**Files:** `backend/lib/ticketPermissions.js`, `backend/routes/tickets.js`, `src/utils/orgRoles.ts`, `src/hooks/useTicketData.ts`, `AppSidebar.tsx`, `TicketHistoryPage.tsx`

- `canViewTicket`: return true for any active onboarded user (same org).
- `getTicketListScope`: return `{ scope: 'org' }` for all active users (or default list endpoint returns org-wide read).
- Ticket detail: show QA + Developer assignees (already have `qa_assignee_id` / `dev_assignee_id` in API? verify).
- UI: org workload strip or assignment column visible on ticket list for everyone.

**Risk:** broadens IDOR surface if list endpoint leaks PII — must keep write guards.

### Phase E — Soft-delete comments

**Schema migration in DDL.sql:**

```sql
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS deletion_type VARCHAR(20); -- 'author' | 'admin'
```

**API (`comments.js`):**

- DELETE → UPDATE set deleted_* instead of hard DELETE.
- GET → return `is_deleted: true`, `body: null`, message fields: `deleted_by_name`, `deletion_type`.
- Display strings:
  - author: "This comment was deleted."
  - admin: "This comment was removed by {admin first last}."

**UI (`TicketCommentsPanel.tsx`):**

- Render tombstone for deleted comments.
- Delete button: author on own comment; admin on any.
- Disable reply/edit on deleted.

---

## Out of scope (this pass)

- HR report changes (done separately).
- New organization page route (use existing Ticket History with org scope unless user wants dedicated page).
- Email notifications on comment delete.

---

## Test plan (manual)

1. `pnpm db:init` + run new seed SQL — verify assignments split QA/dev by month.
2. HR dashboard — resolution time chart first, shows Jan–May averages.
3. Delete user modal — light background, readable text on cream dashboard.
4. Login as QA user — see all org tickets + assignees, comment, delete own comment (tombstone).
5. Login as admin — delete another user's comment — shows admin name in tombstone.
6. Non-author user cannot delete others' comments (403).

---

## Open questions for user (human-in-the-loop)

1. Seed year: **2026** (matches today) or keep **2025**?
2. Org visibility: read-only for all users, or also see internal notes fields?
3. Should regular **users** (non-admin) see ticket list for entire org, or only ticket detail when linked?
