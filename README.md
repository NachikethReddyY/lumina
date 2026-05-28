# Lumina

Lumina is a full-stack AI-powered helpdesk and issue-tracking platform. It uses a Vite + React + TypeScript frontend, an Express backend, and PostgreSQL for relational storage, reporting, authentication support tables, ticket workflow state, audit history, and seed data.

The project is built for database design and web development assessment. It demonstrates a complete ticket lifecycle: account creation, OTP verification, Google OAuth linking, onboarding, approval, ticket creation, AI-assisted routing, QA/developer assignment, comments, status changes, notifications, dashboards, and HR-style reporting.

---

## Current Repo Decisions

| Decision | Why it is there |
|---|---|
| `pnpm` workspace | One root install can manage the frontend package and `backend/` package together. |
| Root `.env` | Current database scripts source `.env` directly. The backend can also fall back to `.env` when profile-specific files are absent. |
| `PORT=5001` | Avoids common macOS conflicts on port `5000`; the frontend points to `http://localhost:5001`. |
| `kill-ports.sh` | Clears local app ports when stale dev servers block startup. It checks PostgreSQL but does not kill it. |
| `DDL.sql` plus `seed.sql` | Schema/base fixtures are separated from the larger demo ticket dataset. |
| `refresh.sql` | Gives a repeatable local reset path before reloading schema and seed data. |
| `rebalance_performance.sql` | Optional reporting helper for HR/demo performance data. |
| Roles simplified to `user` and `admin` | Department-aware backend helpers distinguish HR, managers, developers, and QA without expanding the database role enum. |
| `ticket_assignment` table | Keeps assignment history and supports one active developer plus one active QA assignee per ticket. |
| JSONB ticket metadata | Stores AI routing reasoning and provider-specific data without changing schema for every routing payload update. |

---

## Quick Start

```bash
pnpm install
pnpm run kill-ports
pnpm run db:init
pnpm run dev
```

Open the app at [http://localhost:5173](http://localhost:5173). The API runs on the port in `.env`, currently expected to be `5001`.

---

## Environment

Create or update the root `.env` file before running the app.

Required local values:

```ini
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/lumina
PORT=5001
VITE_API_URL=http://localhost:5001
NODE_ENV=development

JWT_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-long-random-secret
JWT_ACCESS_EXPIRES_IN=8h

FRONTEND_URL=http://localhost:5173,http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD="your-gmail-app-password"
SMTP_FROM_EMAIL=your-email@gmail.com

LUMINA_PROVIDER=opencode
API_KEY=your-provider-api-key
LUMINA_MODEL=deepseek-v4-flash-free

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

VITE_SESSION_TIMEOUT=1h
```

Security note: `.env` is ignored by Git and must stay uncommitted. If real secrets are pasted into chat, screenshots, issues, or commits, rotate them.

The backend environment loader in `backend/lib/loadRootEnv.js` resolves env files in this order:

| Case | File used |
|---|---|
| `LUMINA_ENV_FILE=/path/to/file` | Explicit file path |
| `LUMINA_PROFILE=development` or `local` | `.env.development`, then `.env` fallback |
| `LUMINA_PROFILE=hosting` or `production` | `.env.hosting`, then `.env` fallback |
| No profile | `.env`, then `.env.development`, then `.env.hosting` |

The current root database commands source `.env` directly, so `.env` is the safest local default.

---

## Commands

### Root Commands

These commands are defined in the root `package.json`.

| Command | What it does | Why it exists |
|---|---|---|
| `pnpm install` | Installs root and backend workspace dependencies. | Standard setup command for the pnpm workspace. |
| `pnpm run install:all` | Runs `pnpm install`. | Friendly alias for full project dependency install. |
| `pnpm run install:backend` | Runs `pnpm --dir backend install`. | Installs only backend dependencies when backend package changes. |
| `pnpm run dev` | Runs backend and frontend together with `concurrently`. | Main day-to-day development command. |
| `pnpm run dev:backend` | Runs the backend through `pnpm --dir backend run dev` with `LUMINA_PROFILE=development`. | Starts only the Express API with nodemon reloads. |
| `pnpm run dev:frontend` | Runs Vite with `LUMINA_PROFILE=development`, host `0.0.0.0`, and mode `development`. | Starts only the React dev server. |
| `pnpm run dev:hosting` | Runs backend and frontend together with hosting profile settings. | Tests hosting-like env behavior locally. |
| `pnpm run dev:backend:hosting` | Runs backend dev server with `LUMINA_PROFILE=hosting`. | Tests hosted/production-style backend env values locally. |
| `pnpm run dev:frontend:hosting` | Runs Vite with mode `hosting`. | Tests hosted/production-style frontend env values locally. |
| `pnpm run start` | Runs hosted-profile backend plus Vite preview concurrently. | Local smoke test for a built/preview-style app. |
| `pnpm run start:backend` | Runs `node backend/server.js` with `LUMINA_PROFILE=hosting`. | Starts the API without nodemon. |
| `pnpm run start:frontend` | Runs `vite preview --host 0.0.0.0`. | Serves the production build from `dist/`. |
| `pnpm run build` | Runs `pnpm run build:frontend`. | Main build command. |
| `pnpm run build:frontend` | Runs TypeScript build checks and `vite build --mode hosting`. | Produces the frontend production bundle in `dist/`. |
| `pnpm run lint` | Runs `eslint .`. | Checks source code for lint issues. |
| `pnpm run lint:frontend` | Runs `eslint .`. | Frontend-oriented alias for the same lint check. |
| `pnpm run db:init` | Sources `.env`, then runs `DDL.sql` and `seed.sql` with `psql`. | Creates schema and loads demo data into PostgreSQL. |
| `pnpm run db:seed` | Sources `.env`, then runs only `backend/db/seed.sql`. | Reapplies demo data without rebuilding the schema. |
| `pnpm run db:refresh` | Sources `.env`, runs `refresh.sql`, then `DDL.sql`, then `seed.sql`. | Resets local database state and reloads everything. |
| `pnpm run kill-ports` | Runs `bash ./kill-ports.sh`. | Frees local app ports before starting dev servers. |

### Backend Commands

These commands are defined in `backend/package.json`.

| Command | What it does | Why it exists |
|---|---|---|
| `pnpm --dir backend run dev` | Runs `nodemon server.js`. | Restarts the API automatically during backend development. |
| `pnpm --dir backend run start` | Runs `node server.js`. | Starts the backend without file watching. |
| `pnpm --dir backend run test` | Prints `Error: no test specified` and exits with code 1. | Placeholder; backend tests have not been wired into this script yet. |

### Database Commands Without Package Scripts

Use these when debugging PostgreSQL directly.

| Command | What it does |
|---|---|
| `createdb lumina` | Creates the local database if it does not already exist. |
| `psql "$DATABASE_URL" -f backend/db/DDL.sql -f backend/db/seed.sql` | Manually applies schema plus seed data. |
| `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/refresh.sql -f backend/db/DDL.sql -f backend/db/seed.sql` | Manual equivalent of `pnpm run db:refresh`. |
| `psql "$DATABASE_URL" -f backend/db/rebalance_performance.sql` | Optional helper to rebalance historical demo performance data. |

### Port Cleanup

`kill-ports.sh` checks these ports:

| Port | Purpose | Behavior |
|---|---|---|
| `5001` | Express API | Kills the process using the port. |
| `5173` | Vite dev server | Kills the process using the port. |
| `4173` | Vite preview server | Kills the process using the port. |
| `5432` | PostgreSQL | Reports whether PostgreSQL is running, but does not kill it. |

Run it through the package script:

```bash
pnpm run kill-ports
```

---

## Project Structure

```text
.
├── src/                         React + Vite frontend
├── backend/                     Express API
│   ├── db/                      PostgreSQL schema, seed, refresh scripts
│   ├── lib/                     JWT, mailer, routing, reports, permissions
│   ├── middleware/              Auth, rate limit, API version, error handling
│   ├── routes/                  REST API route modules
│   └── uploads/avatars/         Local avatar uploads
├── assets/lumina-brand/         Logo and brand notes
├── docs/                        Supporting project documentation and ERD assets
├── public/                      Static frontend assets
├── dist/                        Vite production output
├── DESIGN.md                    Main design reference
├── report.md                    Database systems project report
├── kill-ports.sh                Local port cleanup helper
├── package.json                 Root workspace scripts and frontend deps
├── backend/package.json         Backend scripts and backend deps
└── pnpm-workspace.yaml          pnpm workspace definition
```

---

## Application Features

| Capability | Details |
|---|---|
| Ticket lifecycle | Create, classify, route, assign, comment, resolve, close, and rate tickets. |
| Authentication | Email/password signup, OTP verification, password reset, Google OAuth linking, JWT sessions. |
| Account governance | Pending accounts, approval flow, onboarding completion, protected routes. |
| Role-aware access | Database roles stay simple while departments drive HR, manager, developer, and QA behavior. |
| AI routing | Configurable provider through `LUMINA_PROVIDER`, `API_KEY`, and `LUMINA_MODEL`; fallback keeps routing usable. |
| Assignment model | Active developer and QA assignments are tracked separately while preserving history. |
| Dashboards | Workload, ticket status, priority, ageing, closure, and performance analytics. |
| Reports | HR-style reporting logic in `backend/lib/hrReport.js` and project writeup in `report.md`. |
| Uploads | Avatar upload via Multer with image validation and local static serving. |
| Auditability | Important account and ticket events are stored in `audit_logs`. |

---

## Database Design

The database uses normalized relational tables, UUID primary keys, enum types, foreign keys, partial unique indexes, JSONB metadata, and a reporting view.

| Entity | Purpose |
|---|---|
| `users` | Accounts, roles, status, email verification state, profile data, department, onboarding, approval metadata. |
| `categories` | Ticket classification lookup records. |
| `tickets` | Core helpdesk issue records with status, priority, type, submitter, closure time, and metadata. |
| `ticket_assignment` | Assignment history for developer and QA ownership. |
| `ticket_comments` | Ticket discussion, including soft deletion metadata. |
| `audit_logs` | Append-only event history for account, routing, and ticket actions. |
| `oauth_accounts` | Google OAuth identity links. |
| `email_verifications` | Signup verification token and OTP records. |
| `password_reset` | Password reset token and OTP records. |
| `sessions` | Server-side login session records. |
| `admin_workload` | Reporting view for open workload and priority-weighted load. |

Key integrity decisions:

- UUIDs come from PostgreSQL `pgcrypto`.
- Enums constrain user roles, user statuses, ticket types, priorities, statuses, OAuth providers, and assignment roles.
- Partial unique indexes enforce one active developer assignment and one active QA assignment per ticket.
- Operational rows cascade where appropriate, while audit actor references use `ON DELETE SET NULL` to preserve history.
- Category creator references use `ON DELETE SET NULL` so categories survive account deletion.

---

## API Overview

The backend exposes versioned routes under `/api/v1`.

| Route module | Purpose |
|---|---|
| `auth.js` | Signup, login, OTP verification, reset password, Google OAuth linking. |
| `tickets.js` | Ticket creation, listing, detail, routing, status changes, assignment, comments, ratings. |
| `users.js` | User directory, profile updates, approval, deletion, avatar upload. |
| `categories.js` | Ticket category lookup and management. |
| `comments.js` | Comment operations. |
| `notifications.js` | Notification data for account and ticket events. |
| `auditLogs.js` | Audit event access. |
| `reports.js` | HR and reporting endpoints. |
| `userSummary.js` | User summary data for dashboards and profile surfaces. |

The frontend calls these through `src/utils/apiClient.ts`, which centralizes JSON parsing, auth headers, typed domain wrappers, and API error handling.

---

## Report Summary

The contents below summarize the project report in `report.md` so the README contains the assessment context as well as the runbook.

### Report Metadata

| Field | Value |
|---|---|
| Project | Lumina: AI-Powered Helpdesk and Issue Tracking Platform |
| Student | Yeddula Nachiketh Reddy |
| Student ID | 2523541 |
| Date | May 28, 2026 |
| Repository | `soc-DBSP/react-nodejs-project1-NachikethReddyY` |
| DDL | `backend/db/DDL.sql` |
| Seed data | `backend/db/seed.sql` |
| ERD | Lucid Chart plus repository ERD assets under `docs/` |

### Project Overview

Lumina is an internal helpdesk and issue-tracking platform for structured, auditable support workflows. It is designed around the full lifecycle of a ticket: user registration, email verification, onboarding, approval, ticket creation, category classification, priority selection, AI-assisted routing, assignment, QA verification, developer handoff, comments, audit history, notifications, analytics, and HR performance reporting.

The database is central to the application rules. User roles, account statuses, email verification records, onboarding state, tickets, assignments, comments, audit events, sessions, OAuth links, and password reset records are all represented in relational tables with constraints and indexes.

### Development Phases

| Phase | Work completed |
|---|---|
| Phase 1 | Built the Vite/React/TypeScript frontend foundation, design system, auth screens, dashboard shell, and initial documentation. |
| Phase 2 | Added Express, PostgreSQL, DDL, auth middleware, ticket API structure, and versioned `/api/v1` routes. |
| Phase 3 | Implemented signup, OTP verification, login, password reset, Google OAuth linking, onboarding, pending-user handling, and approval. |
| Phase 4 | Built the ticket lifecycle: creation, category/type/priority fields, comments, status transitions, AI routing, assignments, QA/developer handoff, and audit logs. |
| Phase 5 | Expanded dashboards, role-aware views, workload charts, HR reports, ticket closure analytics, and six months of historical seed data. |
| Phase 6 | Standardized the repo around pnpm, split seed data from DDL, improved permissions, cleaned roles, and polished setup/documentation. |

### Relationship Model

| Relationship | Implementation |
|---|---|
| User approval | `users.approved_by -> users.id` optional self-reference. |
| User submitted tickets | `users.id -> tickets.submitted_by`. |
| Category tickets | `categories.id -> tickets.category_id`. |
| Ticket comments | `tickets.id -> ticket_comments.ticket_id`. |
| User sessions | `users.id -> sessions.user_id`. |
| OAuth accounts | `oauth_accounts.user_id -> users.id`. |
| Ticket assignees | Many-to-many via `ticket_assignment`. |

The most important modeling decision is the assignment junction table. Instead of putting a single assignee directly on `tickets`, Lumina stores assignment rows with `assignment_role` and `is_active`. This supports current QA/developer ownership and historical reassignment.

### Seed Data

The project includes realistic local demonstration data:

- Base HR, manager, developer, QA, regular user, pending user, and Lumina system accounts.
- Eight IT helpdesk categories.
- Historical tickets from December 2025 through May 28, 2026.
- Roughly 600 generated historical tickets plus curated sample tickets.
- About 20 active tickets overall after sample tickets are included.
- No `pending_routing` tickets in the final seed state.
- No tickets owned by the Lumina system account.
- Assignment distribution across HR, managers, developers, and QA.
- Comments, audit logs, sessions, and OAuth records for realistic screens and reports.

Seeded passwords are documented in `docs/test-users.md`.

### Challenges and Solutions

| Challenge | Solution |
|---|---|
| QA and developer assignments needed history | Used `ticket_assignment` with assignment roles, active flags, and partial unique indexes. |
| `super_admin` made role behavior too broad | Simplified database roles to `user` and `admin`; department-aware helpers handle HR/manager/developer/QA behavior. |
| Dashboards needed realistic data | Added six months of seed tickets, assignments, comments, audit logs, and reporting data. |
| Account deletion should not erase history | Cascaded personal operational rows but preserved audit logs with nullable actors. |
| Avatar uploads needed validation | Used Multer disk storage, image MIME checks, 5 MB limit, and `/uploads` static serving. |
| AI routing should not break demos | Stored routing metadata in JSONB and kept deterministic fallback routing. |
| Tooling needed to be predictable | Standardized on pnpm workspace commands. |
| Unauthorized ticket changes needed backend enforcement | Moved permission logic into backend helpers such as `teamScope` and `ticketPermissions`. |

### Web Development Features

| Feature | Implementation summary |
|---|---|
| Authentication and onboarding | Email/password, OTP, login, reset password, Google OAuth, onboarding fields, sessions, pending approval. |
| Role-aware access control | Protected frontend routes plus backend middleware and permission helpers. |
| Ticket lifecycle | Ticket creation, routing, assignment, comments, status updates, resolution, closure, history. |
| QA/developer workflow | Separate active QA and developer assignments through `ticket_assignment`. |
| AI-assisted routing | Provider-configurable routing with stored reasoning and fallback behavior. |
| Dashboards and analytics | Recharts visualizations for throughput, status, priority, ageing, closure, and top performers. |
| HR reporting | `backend/lib/hrReport.js` computes workload and performance metrics. |
| Notifications and auditability | Audit logs and notification routes support account/ticket event visibility. |
| Avatar/profile management | Onboarding and profile screens support user details and avatar upload. |
| Error/session handling | 404/500 pages, pending approval, idle timeout, protected routes, token handling, API error handling. |

### Report Conclusion

Lumina demonstrates database design through normalized entities, relationships, enum types, indexes, partial unique indexes, JSONB metadata, and a reporting view. It demonstrates implementation through Express routes, PostgreSQL queries, seed scripts, audit logging, authentication flows, ticket workflows, and role-aware dashboards.

The project also demonstrates web development through a React frontend with protected routing, animation, dashboards, OTP flows, profile management, and ticket workbenches. The backend supports API routing, JWT auth, Google OAuth, SMTP email, Multer uploads, AI-assisted routing, permission checks, and static upload serving.

Future improvements include production deployment hardening, completed demo recording, stronger automated backend tests, expanded AI routing evaluation, and optional enterprise identity-provider integration.

---

## Useful SQL Queries

Active tickets by status and priority:

```sql
SELECT status, priority, COUNT(*) AS ticket_count
FROM tickets
WHERE status IN ('open', 'assigned', 'in_progress', 'on_hold', 'pending_routing')
GROUP BY status, priority
ORDER BY status, priority;
```

Current assignee workload:

```sql
SELECT email, first_name, last_name, total_open, load_score
FROM admin_workload
ORDER BY load_score DESC, total_open DESC;
```

Ticket volume by month:

```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS created,
  COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) AS completed
FROM tickets
GROUP BY month
ORDER BY month;
```

Tickets with active developer and QA assignments:

```sql
SELECT
  t.title,
  dev_user.email AS developer,
  qa_user.email AS qa
FROM tickets t
JOIN ticket_assignment dev
  ON dev.ticket_id = t.id
 AND dev.is_active = TRUE
 AND dev.assignment_role = 'developer'
JOIN users dev_user ON dev_user.id = dev.assigned_to
JOIN ticket_assignment qa
  ON qa.ticket_id = t.id
 AND qa.is_active = TRUE
 AND qa.assignment_role = 'qa'
JOIN users qa_user ON qa_user.id = qa.assigned_to
ORDER BY t.created_at DESC;
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| API port already in use | Run `pnpm run kill-ports`. |
| PostgreSQL port `5432` already in use | Usually expected if PostgreSQL is running. Stop it manually only when needed, for example `brew services stop postgresql`. |
| Database tables missing | Run `pnpm run db:init`. |
| Need a clean local database | Run `pnpm run db:refresh`. |
| Frontend cannot reach API | Check `VITE_API_URL` matches the backend `PORT`. |
| Google sign-in fails | Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `VITE_GOOGLE_CLIENT_ID`; the Vite value must match the frontend client ID. |
| OTP email does not send | Check SMTP values and use a Gmail App Password, not the account password. |
| Backend tests fail immediately | `backend/package.json` still has a placeholder `test` script. |

---

## Reference Docs

| File | Purpose |
|---|---|
| `report.md` | Full database systems project report. |
| `DESIGN.md` | Main design documentation at repo root. |
| `docs/design.md` | Additional design reference. |
| `docs/lumina.md` | Lumina design system notes. |
| `docs/test-users.md` | Seeded demo users and credentials. |
| `docs/stack-analysis.md` | Stack and repository inventory. |
| `docs/prd.md` | Product requirements notes. |
| `docs/view-erd.html` | Local ERD viewer. |
| `docs/lumina-current-erd.svg` | ERD asset used by the report. |
