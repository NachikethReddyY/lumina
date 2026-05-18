# Handoff: Ticket Detail / Activity / Routing

**Branch:** `migrate-pnpm-redesign-2026`  
**Last commit:** `b8d3451` — `Improve ticket comments and activity refresh`

## What’s done

### Ticket detail page (`src/pages/TicketDetailPage.tsx`)
- Comment form sits under the ticket content.
- Comments render as a thread below the form, newest first.
- Activity refreshes:
  - every 60 seconds
  - immediately after comment add/delete
  - after reroute
  - after status change
  - after rating change
- Added delete support for comments.
- Comment delete is allowed for the author or admins.

### API
- `src/utils/apiClient.ts`
  - added `ticketsApi.deleteComment(ticketId, commentId)`
- `backend/routes/comments.js`
  - added `DELETE /tickets/:ticketId/comments/:commentId`
  - writes audit event `ticket_comment_deleted`

## Current known issues / next work

1. **Activity text is too generic**
   - `Status updated` should become something like:
     - `Status changed from open to assigned`
     - `Status changed from pending_routing to assigned`
   - should include actor when available.

2. **Routing flow needs to be fixed**
   - New tickets should always go through AI routing first.
   - Then assignment should happen from the AI decision.
   - Current flow still has cases where routing can feel manual / unclear.

3. **Ticket page layout needs redesign**
   - Activity should be on the right.
   - Ticket content + replication steps should be in the main left area.
   - AI routing panel should be collapsible.
   - Keep comments and activity behavior the same.

4. **Activity should reflect the full lifecycle**
   - creation
   - AI routing
   - assignment
   - comments
   - reroutes
   - status changes
   - rating

## Suggested implementation order

1. Fix `formatEventText()` so status events show old/new status.
2. Make creation + routing write clearer metadata in audit logs.
3. Ensure ticket creation always triggers AI routing.
4. Rework the detail page layout.
5. Collapse AI routing section.

## Useful files

- `src/pages/TicketDetailPage.tsx`
- `src/pages/TicketDetailPage.css`
- `src/utils/apiClient.ts`
- `backend/routes/comments.js`
- `backend/routes/tickets.js`

## Notes

There are other unrelated local modifications in the repo already. Avoid touching them unless needed.
