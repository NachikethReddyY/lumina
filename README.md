# Lumina

Lumina is a full-stack helpdesk and issue-tracking app with:

- an Express + PostgreSQL backend
- a Vite + React frontend
- email/password auth with OTP verification
- Google OAuth account linking
- role-based access for `user`, `admin`, and `super_admin`
- AI-assisted ticket routing with a Gemini fallback to rules-based routing

## Project structure

- `/Users/nr/Developer/dbs-restart/backend` — API, auth, database, routing
- `/Users/nr/Developer/dbs-restart/react-user-dashboard` — frontend app
- `/Users/nr/Developer/dbs-restart/backend/db/init.sql` — schema + seed data
- `/Users/nr/Developer/dbs-restart/docs/test-users.md` — seeded demo credentials
- `/Users/nr/Developer/dbs-restart/production.md` — free deployment guidance

## One-time setup

1. Copy the root environment file:

```bash
cp .env.example .env
```

2. Fill in at least:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB
PORT=5000
JWT_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000
```

3. Optional but recommended:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

GOOGLE_CLIENT_ID=your-google-web-client-id
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id

GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
```

The backend always reads the repo-root `.env`. The frontend reads the same file for `VITE_*` variables.

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

### Development with Bun

```bash
bun run dev
```

This starts:

- backend on `http://localhost:5000`
- frontend on `http://localhost:5173`

### If port 5000 is already in use (`EADDRINUSE`)

Something else is listening on the same port as `PORT` (default **5000**). Free it or pick another port in `.env` (`PORT` and `VITE_API_URL` must stay aligned).

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

Apple’s **AirPlay Receiver** sometimes uses port 5000. If `lsof` shows `ControlCenter` or similar on `5000`, turn off **AirPlay Receiver** under **System Settings → General → AirDrop & Handoff** (wording varies by macOS version), or set `PORT` / `VITE_API_URL` to another free port (for example `5001`) in `.env`.

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

- `/Users/nr/Developer/dbs-restart/docs/test-users.md`

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

- `/Users/nr/Developer/dbs-restart/production.md`

That file explains the realistic free deployment options for Vercel, Bun, PostgreSQL, and SMTP.
