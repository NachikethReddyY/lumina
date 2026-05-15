# Documentation

## 1 Introduction

This document summarizes **Lumina**, the full-stack application in this repository: what problem it addresses, who it serves, how the system is put together, and how work is typically sequenced from local setup through deployment.

The canonical developer setup, commands, and environment variables are described in the root `README.md`. This file focuses on **project overview** and **workflow / phases** so stakeholders can orient quickly without reading every technical detail.

---

## 1.1 Project Overview

### Project domain

Lumina operates in the **IT helpdesk and internal issue-tracking** domain. It supports organizations that need:

- **Ticket intake and lifecycle** — users raise issues; staff triage, assign, and resolve them.
- **Identity and trust** — email/password accounts with **OTP verification**, optional **Google OAuth** linking, and server-enforced approval for new accounts.
- **Governance** — **role-based access** for end users, administrators, and super administrators (account approval, workload oversight, system-wide controls).

The product is aimed at scenarios such as **classroom demos**, **small teams**, or **prototypes** where a credible helpdesk experience (auth, roles, tickets, routing) is required without building everything from scratch.

### Technical overview

Lumina is a **monorepo-style** full-stack application:

| Layer | Location | Stack (summary) |
|-------|----------|------------------|
| API & data | `backend/` | Node/Express, PostgreSQL, JWT auth, parameterized SQL, rate-limited auth endpoints |
| Client | `react-user-dashboard/` | Vite, React, TypeScript |
| Database schema & seeds | `backend/db/init.sql` | Schema plus demo users, tickets, categories, assignments, ratings, audit data |

**Intelligent routing:** when configured, the backend can use **Google Gemini** to help classify and route tickets; if the AI path is unavailable, **rules-based routing** keeps assignment working.

**Supporting material in-repo:** `docs/test-users.md` (seeded credentials for testing), `production.md` (deployment options and constraints, including low-cost / free-tier paths).

---

## 1.2 Project workflow

The sections below describe **phases of the work** in a logical order. They are not tied to calendar dates; adjust duration and parallelism to your team or course schedule.

### Phase A — Discovery and alignment

- Confirm scope: which roles, ticket flows, and integrations (SMTP, Google OAuth, Gemini) are in scope for the first milestone.
- Agree on environments: local PostgreSQL, shared staging DB (if any), and production provider choices (see `production.md`).

### Phase B — Foundation (repository and data)

- Clone the repository and configure the **root** `.env` from `.env.example` (`DATABASE_URL`, `PORT`, `JWT_*`, `FRONTEND_URL`, `VITE_API_URL`, and optional SMTP / Google / Gemini keys as needed).
- Install dependencies (`npm run install:all` or equivalent) and **initialize the database** (`npm run db:init` or direct `psql` per `README.md`).
- Verify schema and seeds: super admin, admins, users, pending accounts, and sample ticket data load as expected.

### Phase C — Core platform (auth and authorization)

- Implement or harden **sign-up, OTP verification, login, and OAuth linking** against the live API.
- Enforce **roles** (`user`, `admin`, `super_admin`) in middleware and UI so that ticket visibility and admin actions cannot be bypassed from the client alone.

### Phase D — Product features (helpdesk flows)

- **Users:** create and track their own tickets; complete any post-resolution steps (e.g. ratings) if applicable.
- **Admins:** pick up assigned work, update ticket state, and collaborate within the rules of the schema and API.
- **Super admins:** account approval, operational oversight, and cross-cutting configuration that the product exposes.
- **Routing:** wire optional Gemini-based routing and validate fallback behavior when keys or services are absent.

### Phase E — Quality, security, and documentation

- Exercise **auth rate limits**, JWT expiry, and OTP enforcement end-to-end.
- Run frontend lint/build checks as appropriate (`README.md` scripts).
- Keep **test credentials** and deployment notes current (`docs/test-users.md`, `production.md`).

### Phase F — Release and operations

- Deploy frontend and backend per your chosen host (e.g. Vercel for the SPA; managed PostgreSQL; external SMTP). Follow constraints and trade-offs documented in `production.md`.
- Monitor usage against free-tier limits if applicable; plan upgrades if traffic or email volume grows.

### Day-to-day development workflow (summary)

For ongoing work after Phase B:

1. Run `npm run dev` (or `bun run dev`) from the repository root to start API and web app together.
2. Make backend changes with the API contract and migrations/init script in mind; extend the frontend against the same `VITE_API_URL`.
3. Re-run `db:init` only when you intend to reset local data (it reapplies seed content).

---

*For command-level setup and security notes, see `README.md`. For hosting and cost assumptions, see `production.md`.*
