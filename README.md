# Lumina

**Lumina** is a full-stack AI-powered helpdesk and issue-tracking platform built with an Express + PostgreSQL backend and a Vite + React frontend.

It combines intelligent ticket routing, role-based access control, and real-time notifications in a modern editorial-quality interface.

---

## Features

| Capability | Details |
|------------|---------|
| **Ticket lifecycle** | Create, view, assign, route, resolve, and rate tickets end-to-end |
| **Auth & accounts** | Email/password with OTP verification · Google OAuth linking · server-side approval flow |
| **Roles** | `user`, `admin`, `super_admin` — enforced in UI and middleware |
| **AI routing** | Google Gemini classifies and routes tickets; falls back to rules-based assignment |
| **Notifications** | Real-time event stream for status changes, comments, and ratings |
| **Dashboard analytics** | Workload distribution, priority counts, queue health metrics |

---

## Project overview and workflow

Lumina operates in the **IT helpdesk and internal issue-tracking** domain. It supports organisations that need:

- **Ticket intake and lifecycle** — users raise issues; staff triage, assign, and resolve them.
- **Identity and trust** — email/password accounts with **OTP verification**, optional **Google OAuth** linking, and server-enforced approval for new accounts.
- **Governance** — **role-based access** for end users, administrators, and super administrators (account approval, workload oversight, system-wide controls).

The product is aimed at scenarios such as **classroom demos**, **small teams**, or **prototypes** where a credible helpdesk experience is required without building everything from scratch.

For a detailed inventory of the current frontend/backend stack, package counts, database tables, routes, uploads, and setup notes, see [docs/stack-analysis.md](docs/stack-analysis.md).

### Technical overview

| Layer | Location | Stack |
|-------|----------|-------|
| API & data | `backend/` | Node/Express, PostgreSQL, JWT auth, parameterised SQL, rate-limited auth endpoints |
| Client | repo root (`src/`, Vite) | Vite, React, TypeScript |
| Database schema & seeds | `backend/db/DDL.sql` | Schema plus demo users, tickets, categories, assignments, ratings, audit data |

When configured, the backend can use **Google Gemini** to help classify and route tickets; if the AI path is unavailable, **rules-based routing** keeps assignment working.

---

## Quick start

```bash
# 1. Install (pnpm workspace — root + backend)
pnpm install

# 2. Set environment variables (see "Environment setup" below)
cp .env.development.example .env.development
cp .env.hosting.example .env.hosting
# edit both files with your DATABASE_URL, JWT_SECRET, SMTP creds, etc.

# 3. Initialise the database
pnpm db:init          # or: psql "$DATABASE_URL" -f backend/db/DDL.sql

# 4. Start everything
pnpm dev              # backend on :5000, frontend on :5173
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Runtime (frontend and backend) |
| pnpm | ≥ 9 | Package manager (monorepo workspace) |
| PostgreSQL | ≥ 14 | Database |
| Git | any | Source control |

Install Node + pnpm via [Homebrew](https://brew.sh/) on macOS:

```bash
brew install node pnpm
```

---

## Environment setup

Lumina uses **profile-switched env files** so you can keep local and hosting settings side by side without editing `.env` on every switch.

| File | When to use |
|------|-------------|
| `.env.development` | Day-to-day coding (`PORT=5000`, `DATABASE_URL=localhost`, `VITE_API_URL=http://localhost:5000`) |
| `.env.hosting` | Staging/production simulation (`PORT=5001`, `VITE_API_URL=http://localhost:5001`, managed `DATABASE_URL`) |

Each file needs these core variables (see the `.example` versions for full detail):

```
# API server
PORT=5000
DATABASE_URL=postgresql://USER:PASS@localhost:5432/lumina
JWT_SECRET=your-random-secret
JWT_REFRESH_SECRET=your-random-secret
JWT_ACCESS_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

# Frontend (VITE_* only — exposed to browser by Vite)
VITE_API_URL=http://localhost:5000
VITE_API_PREFIX=/api/v1
VITE_GOOGLE_CLIENT_ID=       # optional — for Google OAuth

# Optional
SMTP_HOST=smtp.gmail.com         # SMTP server
SMTP_USER=your-email@gmail.com   # Gmail address
SMTP_PASSWORD=your-app-password  # Google App Password
GEMINI_API_KEY=                  # optional — AI routing tier
```

### How profiles work

| Profile | Env file loaded by API | Vite mode |
|---------|----------------------|-----------|
| `pnpm dev` | `.env.development` | `development` |
| `pnpm dev:hosting` | `.env.hosting` | `hosting` |
| `pnpm build` | `.env.hosting` | `hosting` |

**Legacy fallback:** if no profile file exists, the API silently falls back to `.env` at the repo root. Set `LUMINA_ENV_FILE=<path>` to point to any file explicitly.

---

## Install dependencies

```bash
pnpm install
```

This installs both the **root workspace package** (frontend) and the **`backend/` workspace package** in one pass thanks to the pnpm workspace configuration (`pnpm-workspace.yaml`).

To install backend-only deps:

```bash
pnpm --dir backend install
```

---

## Database setup

### Automated (recommended)

```bash
pnpm db:init
```

Runs `psql "$DATABASE_URL" -f backend/db/DDL.sql` — creates schema, seeds demo users, categories, tickets, assignments, and ratings.

### Manual / fresh reset

```bash
# Create the DB first if it doesn't exist
createdb lumina

# Apply schema + seeds
psql "$DATABASE_URL" -f backend/db/DDL.sql
```

`backend/db/DDL.sql` holds the raw schema in one file; `backend/db/index.js` wraps it if you prefer programmatic control.

---

## Run locally

### Full stack — development profile

```bash
pnpm dev
```

- API on **http://localhost:5000** (or whatever `PORT` is set to in `.env.development`)
- Frontend on **http://localhost:5173**

Only the frontend (hot-reload dev server):

```bash
pnpm run dev:frontend
```

### Hosting profile locally

Use `.env.hosting` settings (e.g. Neon `DATABASE_URL`, `VITE_API_URL=http://localhost:5001`) without redeploying:

```bash
pnpm run dev:hosting
```

### Production build

```bash
pnpm run build
```

Outputs to `dist/`. Preview it locally before pushing:

```bash
pnpm run start
```

### Port 5000 already in use?

macOS — AirPlay Receiver commonly steals port 5000. Either turn it off in **System Settings → General → AirDrop & Handoff** or change `PORT` and `VITE_API_URL` in `.env.development` (e.g. to `5001`).

---

## How the backend connects to the frontend

The main runtime link between the two is the `VITE_API_URL` environment variable.

```
Browser → Vite dev server (5173) → VITE_API_URL (http://localhost:5001) → Express API → PostgreSQL
```

In production, leave `VITE_API_URL` unset/empty so the browser calls same-origin `/api/v1` and `vercel.json` rewrites route requests to Express handlers on Vercel Functions / a hosted server.

### The API client

All frontend HTTP calls go through a thin wrapper at `src/utils/apiClient.ts`. The raw client is intentionally generic (a `request()` helper built on `fetch`), and each domain surface has its own typed wrapper imported from there:

```
src/utils/apiClient.ts          ← raw request() helper + typed types
  ├─ ticketsApi  (get, getComments, getActivity, rate, updateStatus, reroute, askAI, addComment)
  ├─ usersApi    (list, get, update, delete, approve)
  ├─ commentsApi
  ├─ authApi     (signup, login, verifyOTP, forgotPassword, resetPassword, linkGoogle)
  ├─ categoriesApi
  ├─ notificationsApi
  └─ auditLogsApi
```

The helpers handle `Authorization: Bearer <token>` header injection, error surfacing, and JSON parsing consistently so no individual page has to repeat that logic.

### Profile switching in the browser

The build process inlines whatever `VITE_*` variables are in the **active** `.env` file. You don't need restart old servers when switching — Vite reload handles hot module replacement during development.

For local hosting-profile development, set `VITE_API_URL=http://localhost:5001`. For deployment, leave it empty/unset so the same-origin `/api/v1` path works with `vercel.json` rewrites.

---

## Libraries and components used

### Frontend

| Library | Purpose |
|---------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety throughout (strict mode) |
| **Vite 6** | Build tool and dev server |
| **Tailwind CSS v4** | Utility-first styling (shadcn-compatible utilities) |
| **shadcn/ui** | Pre-built accessible component primitives (Dialog, Dropdown Menu, Tooltip, OTP Input, etc.) |
| **Framer Motion 12** | Page transitions, shared layout animations, staggered list reveals |
| **React Router 7** | SPA routing with role-protected routes |
| **Lucide React** | Icon set (consistent, lean SVG) |
| **@/react-oauth/google** | Google OAuth sign-in / account linking |
| **React Hook Form + Zod** | Validation schema on auth / ticket forms |
| **Recharts** | Charts on the admin dashboard |
| **Radix UI** | Headless primitives (Tooltip, Dropdown Menu, Separator) |
| **clsx + tailwind-merge** | Conditional class name composition |
| **PostCSS + Autoprefixer** | Tailwind processing pipeline |

### Backend

| Library | Purpose |
|---------|---------|
| **Express 4** | HTTP server and routing |
| **pg (node-postgres)** | PostgreSQL client (parameterised queries) |
| **jsonwebtoken** | Access and refresh tokens |
| **bcryptjs** | Password hashing before persistence |
| **nodemailer** | SMTP delivery for OTP email verification |
| **@google-gemini** | AI ticket classification and routing |
| **uuid** | Request / database identifiers |
| **dotenv** | Environment variable loading |

### Design tokens

All brand colours, spacing, radii, and typography live in `src/index.css` (CSS custom properties, mapped to Tailwind in `tailwind.config.js` + `src/theme.ts`) so the entire product can be rethemed from one file.

---

## Authentication flow

### Email / password sign-up

1. User submits email + password on the sign-up page.
2. Backend creates a `pending` account (status `pending`) and emails a **6-digit OTP**.
3. Frontend stores the email in `localStorage` and navigates to the OTP entry screen.
4. Backend verifies the code; on success the account moves to `approved` + `verified`.

### Google OAuth

1. Frontend calls `authApi.linkGoogle(credential)`.
2. Backend looks up or creates an `oauth_accounts` row, links it to an existing or new user record.
3. New OAuth-only users still pass through the OTP verify page before using the app.

Both flows enforce server-side role checks before issuing JWT tokens so the client role cannot be spoofed.

### Protected routes

`src/components/ProtectedRoute.tsx` short-circuits unauthenticated users to login and uses `useCurrentUser()` to gate role-specific routes on the frontend. The backend **also** checks roles in every protected endpoint handler.

---

## Roles

| Role | Capabilities |
|------|-------------|
| `user` | Create tickets, view own tickets, comment on own tickets, rate resolutions |
| `admin` | View all assigned tickets, change statuses, re-route, comment, reassign |
| `super_admin` | Everything above + approve accounts, access approval queue, AI routing logs, user directory |

Seeded demo accounts in `docs/test-users.md`.

---

## AI routing

When `GEMINI_API_KEY` is present in the API environment, ticket classification and routing pass through **Google Gemini** (`ticketRouting.js`):

```
submitted ticket → Gemini analyse (category, priority, reasoning) → match to available admin → assign
```

If the Gemini call fails (no key, quota hit, timeout), the backend **falls back silently to rules-based routing** so ticket assignment never breaks. The decision source (`gemini` / `rules` / `fallback`) and reasoning are stored in `ticket.metadata` and surfaced in the ticket detail and admin dashboard.

---

## Security notes

- Passwords are hashed with `bcrypt` before any write to the database.
- All SQL uses **parameterised queries** — no string concatenation.
- Auth endpoints carry **rate-limiting** middleware to limit brute-force attempts.
- JWT **refresh tokens** exist alongside access tokens (longer TTL).
- OTP verification is **server-side**; the frontend only collects the code.
- Role enforcement is **bidirectional** (frontend hides UI actions, backend rejects the call regardless).

---

## Deployment

This section details how to perform both a **local deployment** (connecting to your local PostgreSQL/PG Admin instance) and a **hosted production deployment** (Vercel + Supabase).

### 1. Local Deployment (Local Postgres / PG Admin)

To deploy the application fully on your local machine using your own PostgreSQL instance:

#### Step 1: PostgreSQL Setup
1. Ensure **PostgreSQL** is installed and running on your system (default port `5432`).
2. Open PG Admin, `psql`, or any database client and create a new database named `lumina`:
   ```sql
   CREATE DATABASE lumina;
   ```

#### Step 2: Configure Environment Variables
1. Under the root of your project, ensure you have a `.env.development` file configured.
2. Update the `DATABASE_URL` to point to your local PostgreSQL database (e.g., using PG Admin credentials):
   ```ini
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/lumina
   PORT=5001
   VITE_API_URL=http://localhost:5001
   NODE_ENV=development

   # JWT Secrets
   JWT_SECRET=your_jwt_access_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

   # SMTP Setup (for OTP and emails)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD="your_gmail_app_password"
   SMTP_FROM_EMAIL=your_email@gmail.com

   FRONTEND_URL=http://localhost:5173
   ```

#### Step 3: Initialize Database Schema and Seeds
Run the following script command to import the base tables, audit logs, and seed demo accounts:
```bash
pnpm db:init
```
*(This maps directly to running `psql "$DATABASE_URL" -f backend/db/DDL.sql`)*

#### Step 4: Launch Dev Server
Start both the backend API server and Vite frontend dev server concurrently:
```bash
pnpm run dev
```
- **Backend API Logs**: Running `pnpm run dev` displays clean, consolidated database logs detailing exactly what route/query action occurred without raw SQL noise.
- **Accessing the App**: Open [http://localhost:5173](http://localhost:5173) in your browser to interact with the application.

---

### 2. Hosted Production Deployment (Vercel + Supabase)

See your `supabase_vercel_guide.md` guide for a full deployment guide covering Vercel (frontend & serverless backend) and Supabase (PostgreSQL hosting).

In short:
- **Database Hosting**: Create a Supabase project and get the Connection Pooler URL (usually port `6543` with `pgbouncer=true`). Update your production `DATABASE_URL` environment variable.
- **Frontend/Backend Deployment**: Push your production branch to Vercel.
- **VITE_API_URL**: Leave `VITE_API_URL` empty or unset in the hosted Vercel environment so the browser routes API requests through same-origin `/api/v1` rewrites.
- **Vercel Config**: `vercel.json` (on the production side) handles path rewrites, forwarding all `/api/*` and `/uploads/*` requests to the Express backend serverless function (`backend/server.js`), while routing other paths to Vite's compiled SPA bundle.

---

## Monorepo layout

```
.
├── src/               # React + Vite frontend
├── backend/           # Express API, routes, middleware, db/
│   ├── routes/        # REST endpoints
│   ├── middleware/    # auth, rate-limit, error-handler
│   ├── lib/           # ticketRouting, jwt, mailer, loadRootEnv
│   ├── db/            # DDL.sql + node-pg index.js
│   └── uploads/       # avatar image storage
├── assets/lumina-brand/
│   ├── logo.svg       # brand sparkle mark
│   └── brand-spec.md  # colour / font / spacing tokens
├── docs/              # on-demand documentation (PRD, design, production, test-users)
├── dist/              # Vite production build (git-ignored)
├── package.json       # root workspace deps + scripts
├── pnpm-workspace.yaml
├── vite.config.ts
├── vercel.json        # Vercel function / rewrites config
└── .env.*             # env profiles (git-ignored)
```

---

## Commands at a glance

```
pnpm install            # install root + backend deps
pnpm run dev            # full stack dev
pnpm run dev:frontend   # frontend only
pnpm run dev:hosting    # full stack in hosting profile
pnpm run build          # Vite production build
pnpm run start          # preview built app
pnpm run lint:frontend  # TypeScript + ESLint
pnpm db:init            # reset + seed PostgreSQL
```

---

## Project workflow and phases

The sections below describe **phases of the work** in a logical order. They are not tied to calendar dates; adjust duration and parallelism to your team or course schedule.

### Phase A — Discovery and alignment

- Confirm scope: which roles, ticket flows, and integrations (SMTP, Google OAuth, Gemini) are in scope for the first milestone.
- Agree on environments: local PostgreSQL, shared staging DB (if any), and production provider choices.

### Phase B — Foundation (repository and data)

- Clone the repository and configure the **root** `.env` from [`.env.example`](.env.example) (`DATABASE_URL`, `PORT`, `JWT_*`, `FRONTEND_URL`, `VITE_API_URL`, and optional SMTP / Google / Gemini keys as needed).
- Install dependencies (`pnpm install`) and **initialize the database** (`pnpm db:init` or direct `psql` per this README).
- Verify schema and seeds: super admin, admins, users, pending accounts, and sample ticket data load as expected.

### Phase C — Core platform (auth and authorization)

- Implement or harden **sign-up, OTP verification, login, and OAuth linking** against the live API.
- Enforce **roles** (`user`, `admin`, `super_admin`) in middleware and UI so that ticket visibility and admin actions cannot be bypassed from the client alone.

### Phase D — Product features (helpdesk flows)

- **Users:** create and track their own tickets; complete any post-resolution steps (e.g. ratings) if applicable.
- **Admins:** pick up assigned work, update ticket state, and collaborate within the rules of the schema and API.
- **Super admins:** account approval, operational oversight, and cross-cutting configuration that the product exposes.
- **Routing:** wire optional Gemini-based routing and validate fallback behaviour when keys or services are absent.

### Phase E — Quality, security, and documentation

- Exercise **auth rate limits**, JWT expiry, and OTP enforcement end-to-end.
- Run frontend lint/build checks as appropriate (see scripts above).
- Keep **test credentials** and deployment notes current (`docs/test-users.md`, `docs/production.md`).

### Phase F — Release and operations

- Deploy frontend and backend per your chosen host (e.g. Vercel for the SPA; managed PostgreSQL; external SMTP). Follow constraints and trade-offs documented in `docs/production.md`.
- Monitor usage against free-tier limits if applicable; plan upgrades if traffic or email volume grows.

### Day-to-day development workflow

For ongoing work after Phase B:

1. Run `pnpm dev` from the repository root to start API and web app together.
2. Make backend changes with the API contract and migrations/init script in mind; extend the frontend against the same `VITE_API_URL`.
3. Re-run `db:init` only when you intend to reset local data (it reapplies seed content).

---

## Reference docs

| File | What's in it |
|------|-------------|
| `docs/test-users.md` | Seeded demo credentials for local and classroom demos |
| `docs/lumina.md` | Active design system (colors, typography, layout, component tokens) |
| `docs/design.md` | Extended design-spec reference |
| `docs/olddesign.md` | Legacy dark-mode design spec, kept for reference |
