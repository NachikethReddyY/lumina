# Lumina

Lumina is a full-stack helpdesk and issue-tracking app with:

- an Express + PostgreSQL backend
- a Vite + React frontend
- email/password auth with OTP verification
- Google OAuth account linking
- role-based access for `user`, `admin`, and `super_admin`
- AI-assisted ticket routing with a Gemini fallback to rules-based routing

## Project structure

- `backend/` — API, auth, database, routing
- `src/`, `index.html`, `public/` — Vite + React frontend (repo root)
- `backend/db/init.sql` — schema + seed data
- `docs/test-users.md` — seeded demo credentials
- `docs/production.md` — free deployment guidance
- `decide/` — non-runtime artifacts and drafts (triage; not part of the app build)

## One-time setup (environment)

Use **two files** so you can switch local vs hosting without editing one giant `.env`:

| File | Purpose |
|------|---------|
| `.env.development` | Local machine (Postgres on localhost, `VITE_API_URL=http://localhost:5000`, etc.) |
| `.env.hosting` | Hosting / production-style (deployed `FRONTEND_URL`, `VITE_API_URL=/api/v1` on Vercel, managed `DATABASE_URL`, etc.) |

1. Create both from the examples:

```bash
cp .env.development.example .env.development
cp .env.hosting.example .env.hosting
```

2. Fill in at least **`.env.development`** for day-to-day coding (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `VITE_API_URL`, and optional SMTP / Google / Gemini — see the example files).

3. Fill in **`.env.hosting`** when you want to run the stack against hosting-like settings (or copy values from your Vercel / Neon dashboards).

**How switching works**

- **`npm run dev`** — loads **`.env.development`** for the API (`LUMINA_PROFILE=development`) and runs Vite in **`development`** mode (same file + optional `.env.development.local`).
- **`npm run dev:hosting`** — loads **`.env.hosting`** (`LUMINA_PROFILE=hosting`) and Vite **`hosting`** mode (same + optional `.env.hosting.local`).
- **`npm run build`** — bakes **`VITE_*`** from **hosting** mode (`.env.hosting`), matching a typical production deploy.
- **Legacy:** if you still have a single **`.env`** and no profile files, the API uses that file when `LUMINA_PROFILE` is unset.

**Advanced:** set **`LUMINA_ENV_FILE`** to any path to load one specific file for the API (see `backend/lib/loadRootEnv.js`).

## Install dependencies

### npm

```bash
npm install
npm run install:all
```

### Bun

```bash
bun install
bun run install:bun
```

After that, Bun can use the same root run commands as npm.

## Initialize the database

Make sure PostgreSQL is running and `DATABASE_URL` is valid, then run:

```bash
npm run db:init
```

If the npm script fails (shell quoting issue), use the direct command:

```bash
psql "$DATABASE_URL" -f backend/db/init.sql
```

This creates the schema and seeds:

- one super admin
- several active admins and users
- several pending approval accounts
- categories, tickets, assignments, ratings, and audit logs

## Run the whole app from the repo root

### Development with npm

```bash
npm run dev
```

Loads **`.env.development`** for the API and Vite **development** mode. Starts backend on `http://localhost:5000` (default) and frontend on `http://localhost:5173`.

### Development with Bun

```bash
bun run dev
```

### Hosting profile on your machine

Same scripts work with Bun (`bun run dev:hosting`). Use this when you want **`.env.hosting`** and Vite **`hosting`** mode (e.g. prod `DATABASE_URL`, `VITE_API_URL=/api/v1`) while servers still run on your laptop:

```bash
npm run dev:hosting
```

### If port 5000 is already in use (`EADDRINUSE`)

Something else is listening on the same port as `PORT` (default **5000**). Free it or pick another port in the **active** env file (`.env.development` or `.env.hosting`); keep `PORT` and `VITE_API_URL` aligned.

**macOS and Linux — find and stop the process**

1. See which process holds the port:

```bash
lsof -nP -iTCP:5000 -sTCP:LISTEN
```

2. Stop it using the `PID` from that output (replace `PID` with the number):

```bash
kill PID
```

If it does not exit, force kill (only when you are sure it is safe):

```bash
kill -9 PID
```

If you use `npm run dev` / `bun run dev`, stop that terminal with **Ctrl+C** first; a stray `node` or `bun` process may still be bound until you `kill` it.

**macOS — AirPlay Receiver**

Apple’s **AirPlay Receiver** sometimes uses port 5000. If `lsof` shows `ControlCenter` or similar on `5000`, turn off **AirPlay Receiver** under **System Settings → General → AirDrop & Handoff** (wording varies by macOS version), or set `PORT` / `VITE_API_URL` to another free port (for example `5001`) in `.env.development` (or your legacy `.env`).

**Windows (PowerShell or CMD)**

```text
netstat -ano | findstr :5000
```

Note the PID in the last column, then:

```text
taskkill /PID <PID> /F
```

## Other useful root commands

```bash
npm run build
npm run start
npm run lint:frontend
```

Or with Bun:

```bash
bun run build
```

## Authentication flow

### Email sign-up

- New accounts are created as unverified and pending
- A 6-digit OTP is emailed to the user
- The frontend stores the pending email in local storage
- The OTP page asks only for the code, not the email again
- Once verified, the backend marks the user as verified in PostgreSQL

### Google OAuth

- OAuth accounts are linked through `oauth_accounts`
- New OAuth users still go through the app's OTP verification flow
- Verified status and account approval are enforced server-side

## Roles

- `user` — can create and view their own tickets
- `admin` — can manage assigned tickets
- `super_admin` — can approve accounts, review workload, and oversee the system

## Seeded test accounts

See:

- `docs/test-users.md`

That file contains the demo credentials in plain text for testing and classroom/demo use only.

## Email setup

The project currently uses Nodemailer with SMTP only.

For Gmail SMTP:

1. Turn on 2-step verification
2. Create a Google App Password
3. Put that app password into `SMTP_PASSWORD`

If SMTP is not configured, signup verification emails will not send correctly.

## AI routing

If `GEMINI_API_KEY` is set, Lumina uses Gemini to help classify and route tickets.

If Gemini is unavailable, the backend falls back to rules-based routing so ticket assignment still works.

## Security notes

- JWT expiry is controlled by `JWT_ACCESS_EXPIRES_IN`
- SQL queries use parameterized statements
- OTP verification is enforced server-side
- auth endpoints are rate-limited
- role checks are enforced in backend middleware

## Deployment

See:

- `docs/production.md`

That file explains the realistic free deployment options for Vercel, Bun, PostgreSQL, and SMTP.
