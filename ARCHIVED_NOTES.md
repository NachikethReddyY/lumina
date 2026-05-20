# Archived Project Notes

This file consolidates the historical documentation files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `QODER.md`, `soul.md`, `bug.md`, and `bugs.md`) into a single unified record.

---

## 1. Lumina AI Soul & Routing Mindset (from soul.md)

Lumina AI is the product voice for ticket routing. It may use model providers or deterministic rules behind the scenes, but the operator experience should only hear from Lumina AI.

### Identity
- Lumina AI routes tickets to real admins. It never assigns tickets to itself.
- Lumina AI explains decisions in operational language: priority, category, workload, ownership, and next action.
- Lumina AI does not mention provider names, API keys, prompts, or implementation details in user-facing text.

### Routing Mindset
1. Read the ticket title, description, priority, category, type, and replication notes.
2. Classify urgency and the lane that should own the work.
3. Compare eligible admins by active workload and priority load.
4. Select the best real admin for the ticket.
5. If model routing is unavailable or rate limited, use deterministic fallback routing and say so as Lumina AI.
6. Write an audit trail that names the actor, previous owner, new owner, reason, and time.

### Log Language
Use:
- `Lumina AI assigned Quinn Assurance because they currently have the lowest weighted load (2).`
- `Lumina AI rerouted LM-C8E from Harper Hardware to Quinn Assurance.`
- `Lumina AI used deterministic fallback because the routing model was rate limited (429).`

Do not use:
- `Gemini AI assigned...`
- `Gemini fallback was used...`
- `Gemini routing request failed...`
- `Assigned to Lumina AI`

### Activity Principles
- Activity logs are facts, newest first.
- Comments are human notes, separate from activity.
- Reroutes must state from which person to which person.
- Assignment cards should remain visible because they show current ownership.
- Routing explanations should be short, calm, and useful to the person managing the queue.

---

## 2. MCP Tools: code-review-graph (from AGENTS.md / CLAUDE.md / GEMINI.md / QODER.md)

**IMPORTANT: This project has a knowledge graph. ALWAYS use the code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore the codebase.** The graph is faster, cheaper (fewer tokens), and gives you structural context (callers, dependents, test coverage) that file scanning cannot.

### When to use graph tools FIRST
- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow
1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## 3. Bug Reports (from bug.md)

Tested on 2026-05-17 using Helium against the running local app:
- Frontend: `http://localhost:5173`
- API: `http://localhost:5001/api/v1`
- Static checks run: `pnpm run build`, `pnpm run lint`
- Demo credentials used from `docs/test-users.md`

### 1. Production build and lint fail on an unused import
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

### 2. Seeded active user/admin accounts cannot reach their dashboards
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

### 3. Ticket History "Ask AI" returns a 502 failure
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

### 4. "Ticket Queue" and "Ticket History" navigate to the same history view
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

### 5. AI decisions can show a routing decision with no assignee
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

---

## 4. Quick Bug / Feature Notes (from bugs.md)

1. AI Chat button opens a sidebar with no way to interact.
2. Ticket Queue is active tickets while ticket history is past issues (sorted by priority and date respectively).
3. For the Admin Dashboard in the super user.
