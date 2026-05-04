# Plan: Lumina Backend — Full Implementation

## Context

Backend scaffold exists (Express 5 + pg on port 5000) but is stub-only: plain-text passwords, inline schema that conflicts with the real `init.sql`, no JWT, no route structure. Goal: rebuild the backend properly around the existing `init.sql` schema so it serves the Lumina helpdesk app.

---

## Current State Problems

- `server.js` has inline `CREATE TABLE users` with `SERIAL id` + `password` column — conflicts with `init.sql` (UUID PKs, `password_hash` column)
- Passwords stored/compared plain-text — no bcrypt
- No JWT tokens issued — frontend expects `{ accessToken, refreshToken }`
- `apiClient.ts` refresh URL still points to `https://api.example.com/auth/refresh` (placeholder)
- `server.js` has no route files, no auth middleware, no structure

---

## Confirmed Decisions

1. **firstName/lastName** — store both. Add `first_name` + `last_name` columns to `users` table in `init.sql`.
2. **remember flag** — `remember=true` → 30d refresh token. `remember=false` → 7d refresh token.
3. **AI Routing (Lumina AI)** — New tickets start in `pending_routing`. A system user "Lumina AI" is responsible for routing.
4. **AI Metadata** — Store AI decisions/logs in a `routing_metadata` JSONB column in the `tickets` table.
5. **Backups** — Implement scheduled backups for local Postgres (Infrastructure task).

---

## Implementation Plan

### Step 0 — Init DB from init.sql

Run schema against local Postgres `lumina` DB:
```bash
psql postgresql://nr@localhost:5432/lumina -f backend/db/init.sql
```

**Schema Tweaks for AI:**
- Add `pending_routing` to `ticket_status` enum.
- Add `routing_metadata JSONB` to `tickets` table.
- Seed "Lumina AI" system user (Role: `admin`, Status: `active`).

---

### Step 1 — Install Missing Dependencies

```bash
cd backend
npm install bcrypt jsonwebtoken axios
```

Add to `.env`:
```
JWT_SECRET=<random 32+ char string>
JWT_REFRESH_SECRET=<different random string>
OPENROUTER_API_KEY=<your api key>
```

---

### Step 2 — Restructure server.js

Remove `initializeDatabase()` entirely. Remove inline route handlers. Keep only:
- App setup
- Middleware (`cors`, `body-parser`)
- Route mounting
- DB connection test on startup
- `app.listen()`

**File:** `backend/server.js`

---

### Step 3 — Auth Middleware

**New file:** `backend/middleware/auth.js`

- Reads `Authorization: Bearer <token>` header
- Verifies with `jsonwebtoken.verify()` using `JWT_SECRET`
- Attaches decoded payload to `req.user`

---

### Step 4 — Auth Routes

**New file:** `backend/routes/auth.js` (signup, login, refresh, forgot-password)

---

### Step 5 — Fix Frontend Refresh URL

**File:** `react-user-dashboard/src/utils/apiClient.ts`

Change placeholder URL to `http://localhost:5000/auth/refresh`.

---

### Step 6 — Tickets API & AI Routing Trigger

**New file:** `backend/routes/tickets.js`

- `POST /tickets`: Creates ticket with status `pending_routing`.
- Triggers AI Routing logic immediately (Step 7).

---

### Step 7 — AI Routing Engine (OpenRouter)

**File:** `backend/utils/aiRouter.js`

- Uses OpenRouter API with a cost-effective model.
- Analyzes ticket `title` + `description`.
- Returns structured JSON: `{ category_id, priority, assigned_to_user_id }`.
- Updates the ticket in DB: sets status to `assigned`, populates `routing_metadata` with the AI reasoning.

---

## File Map

| File | Action |
|------|--------|
| `backend/server.js` | Rewrite — strip inline schema/routes, mount route files |
| `backend/db/init.sql` | Add `first_name`/`last_name`, add `pending_routing` status |
| `backend/routes/auth.js` | Create new |
| `backend/routes/tickets.js` | Create new (Ticket creation + AI Trigger) |
| `backend/utils/aiRouter.js` | Create new (OpenRouter integration) |
| `backend/middleware/auth.js` | Create new |
| `react-user-dashboard/src/utils/apiClient.ts` | Fix refresh URL |

---

## Verification

1. `POST /auth/signup` -> `POST /auth/login` -> get tokens.
2. `POST /tickets` -> Check DB for `pending_routing` -> Wait for AI -> Check for `assigned`.
3. Check `routing_metadata` column for AI logs.
