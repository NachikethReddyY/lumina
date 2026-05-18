# Bug Report

Tested on 2026-05-17 using Helium against the running local app:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5001/api/v1`
- Static checks run: `pnpm run build`, `pnpm run lint`
- Demo credentials used from `docs/test-users.md`

## 1. Production build and lint fail on an unused import

Severity: P1 - blocks build/deploy.

Repro:

1. Run `pnpm run build`.
2. Run `pnpm run lint`.

Observed:

- `pnpm run build` exits with TypeScript error `TS6133`.
- `pnpm run lint` exits with `@typescript-eslint/no-unused-vars`.
- Both point at `src/pages/OAuthNamePage.tsx:7`, where `Button` is imported but never used.

Evidence:

- `src/pages/OAuthNamePage.tsx:7`
- Lint also reports warnings in `src/context/ToastContext.tsx:32` and `src/context/ToastContext.tsx:46`.

## 2. Seeded active user/admin accounts cannot reach their dashboards

Severity: P1/P2 - demo accounts listed as active are still blocked by onboarding.

Repro in Helium:

1. Open `http://localhost:5173/login`.
2. Sign in as an active seeded user, for example `alice.user@lumina.test`.
3. Repeat with an active seeded admin, for example `admin.hardware@lumina.test`.

Observed:

- Login succeeds, but the app redirects to `/onboarding`.
- Direct API check confirms these accounts are `status=active`, `email_is_verified=true`, and `onboarding_completed=false`.
- `ProtectedRoute` redirects every non-super-admin with `onboarding_completed=false` to onboarding.
- The database seed inserts active demo users/admins without setting `onboarding_completed`, so it remains the schema default `false`.

Expected:

- Accounts documented as active demo users/admins should be able to enter their role dashboard, or the docs/seed labels should say they intentionally require onboarding first.

Evidence:

- `src/components/ProtectedRoute.tsx:50`
- `backend/db/DDL.sql:55`
- `backend/db/DDL.sql:260`

## 3. Ticket History "Ask AI" returns a 502 failure

Severity: P2 - visible feature is broken in the tested local environment.

Repro in Helium:

1. Sign in as the super admin.
2. Open `Ticket History`.
3. Click `Ask AI`.
4. Ask `What is the current status?`.

Observed:

- The page displays `LUMINA AI` followed by `AI request failed`.
- Direct API repro: `POST /api/v1/tickets/:id/ask` returns `502 {"error":"AI request failed"}`.
- Backend forwards the request to Gemini and returns `502` when Gemini rejects/fails; there is no fallback or clearer local configuration message.

Expected:

- Either provide a working fallback/disabled state when AI is unavailable, or surface an actionable configuration error instead of a generic failure inside the product UI.

Evidence:

- `src/pages/TicketHistoryPage.tsx:58`
- `backend/routes/tickets.js:161`
- `backend/routes/tickets.js:176`
- `backend/routes/tickets.js:187`

## 4. "Ticket Queue" and "Ticket History" navigate to the same history view

Severity: P2 - navigation promises two different workflows but both show the same page.

Repro in Helium:

1. Sign in as the super admin.
2. Click sidebar `Ticket Queue`.
3. Click sidebar `Ticket History`.

Observed:

- `Ticket Queue` navigates to `/tickets`, but the page title is `Ticket History`.
- `Ticket History` navigates to `/tickets/history` and shows the same `Ticket History` table.
- The sidebar has two separate entries, but `src/App.tsx` maps both routes to `TicketHistoryPage`.

Expected:

- `Ticket Queue` should either show a queue-specific view or be renamed/merged with `Ticket History`.

Evidence:

- `src/components/AppSidebar.tsx:120`
- `src/components/AppSidebar.tsx:121`
- `src/App.tsx:44`
- `src/App.tsx:45`
- `src/pages/TicketHistoryPage.tsx:201`

## 5. AI decisions can show a routing decision with no assignee

Severity: P3 - data display inconsistency.

Repro in Helium:

1. Sign in as the super admin.
2. Open `Dashboard`.
3. Select `AI Decisions`.

Observed:

- The row for `App crashes on startup` renders like `RULES P1 App crashes on startup -> 5/13/2026`, with no assignee name between the arrow and date.
- The same ticket is visible in Ticket History as `Open` with a blank assignee.

Expected:

- A routing decision should show who it routed to, or explicitly label the ticket as unassigned/no routing decision.

