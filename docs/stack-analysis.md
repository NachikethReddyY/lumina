# Lumina Stack Analysis

This document inventories the current Lumina codebase: the frontend stack, backend stack, database schema, package counts, upload storage, environment files, and notable setup details.

## Summary

Lumina is a full-stack IT helpdesk app.

| Area | Current stack |
| --- | --- |
| Frontend | Vite, React 19, TypeScript, React Router, Tailwind CSS 4, Radix/shadcn-style UI utilities |
| Backend | Node.js, Express 5, CommonJS backend modules |
| Database | PostgreSQL with `pgcrypto`, UUID primary keys, enum types, indexes, and one workload view |
| Auth | Email/password, OTP email verification, JWTs, refresh tokens, Google OAuth |
| AI | Google Gemini ticket routing with rules-based fallback |
| Email | Nodemailer SMTP |
| Uploads | Multer disk uploads for avatars and chat images |
| Deployment config | Vercel static frontend + Node backend rewrites |
| Package manager | pnpm workspace, with npm lockfile also present |

`pgcrypto` is a PostgreSQL extension that provides cryptographic functions, allowing users to perform tasks such as symmetric and public key encryption, password hashing, and generating data digests. It is useful for enhancing data security within PostgreSQL databases

## Project Layout

| Path | Purpose |
| --- | --- |
| `src/` | React frontend source |
| `src/pages/` | Page-level screens such as login, dashboards, tickets, profile, and account settings |
| `src/components/` | Shared UI, layout, sidebar, chat, input, card, button, toast, and logo components |
| `src/utils/apiClient.ts` | Typed frontend API wrapper around `fetch` |
| `backend/` | Express API server |
| `backend/routes/` | API route modules |
| `backend/middleware/` | Auth, rate limiting, API version, and error handling middleware |
| `backend/lib/` | Mailer, JWT, Google OAuth, ticket routing, validation, env loading helpers |
| `backend/db/` | PostgreSQL connection and DDL schema |
| `backend/uploads/` | Local uploaded images |
| `docs/` | Product, design, test user, and handoff documents |
| `assets/lumina-brand/` | Brand assets and brand spec |

## Frontend

The frontend is a Vite React TypeScript app.

Key files:

| File | Role |
| --- | --- |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Main app routes and shell |
| `vite.config.ts` | Vite config, React plugin, Tailwind Vite plugin, `@` alias |
| `tailwind.config.js` | Tailwind content paths |
| `components.json` | shadcn/Radix-style UI config |

Frontend package counts from `package.json`:

| Package group | Count |
| --- | ---: |
| Runtime dependencies | 27 |
| Dev dependencies | 19 |

Notable frontend packages:

| Package | Why it is here |
| --- | --- |
| `react`, `react-dom` | UI runtime |
| `react-router-dom` | Client-side routing |
| `@vitejs/plugin-react` | React integration for Vite, listed as dev dependency |
| `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/forms` | Styling and Tailwind tooling |
| `@fontsource-variable/inter` | Inter font package |
| `@heroicons/react`, `lucide-react` | Icon sets |
| `@radix-ui/react-dropdown-menu`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`, `radix-ui` | Accessible UI primitives |
| `shadcn`, `class-variance-authority`, `clsx`, `tailwind-merge` | Component composition and class merging |
| `framer-motion` | UI animation |
| `react-hook-form`, `zod` | Forms and validation |
| `input-otp` | OTP input component |
| `react-image-crop` | Avatar/image crop UI |
| `recharts` | Dashboard charts |
| `@react-oauth/google` | Google OAuth button/client integration |
| `tw-animate-css` | Tailwind animation utilities |
| `react-is` | React type checks used by dependencies |
| `multer`, `@types/multer` | Present in root package too, but actual upload handling is backend-side |

Frontend source file count by folder:

| Folder | File count |
| --- | ---: |
| `src/pages/` | 32 |
| `src/components/` | 29 |
| `src/context/` | 4 |
| `src/hooks/` | 2 |
| `src/utils/` | 2 |
| `src/lib/` | 1 |
| Other root `src` files | 6 |

## Backend

The backend is an Express API running on Node.

Key files:

| File | Role |
| --- | --- |
| `backend/server.js` | Loads env, creates app, checks database, starts server |
| `backend/app.js` | Express app factory, security headers, CORS, JSON parsing, static uploads, route mounting |
| `backend/routes/index.js` | Versioned API route registry under `/api/v1` |
| `backend/db/index.js` | PostgreSQL `pg.Pool` connection |
| `backend/lib/ticketRouting.js` | Gemini routing plus deterministic fallback |

Backend package counts from `backend/package.json`:

| Package group | Count |
| --- | ---: |
| Runtime dependencies | 8 |
| Dev dependencies | 2 |

Backend runtime dependencies:

| Package | Why it is here |
| --- | --- |
| `express` | HTTP API server |
| `cors` | Browser CORS support |
| `dotenv` | Env file loading |
| `pg` | PostgreSQL client |
| `jsonwebtoken` | JWT access/refresh tokens |
| `google-auth-library` | Google OAuth token verification |
| `nodemailer` | SMTP email delivery |
| `multer` | Multipart image uploads |

Backend dev dependencies:

| Package | Why it is here |
| --- | --- |
| `nodemon` | Local backend auto-restart |
| `@types/multer` | Multer TypeScript types, even though backend files are JavaScript |

Backend JavaScript file count by folder:

| Folder | File count |
| --- | ---: |
| `backend/routes/` | 9 |
| `backend/lib/` | 9 |
| `backend/middleware/` | 4 |
| `backend/db/` | 1 |
| Backend root JS files | 2 |

## API Surface

Routes are mounted under `/api/v1`.

Total route handlers found: **43**.

| Route module | Handler count | Main purpose |
| --- | ---: | --- |
| `auth.js` | 9 | login, signup, email verification, OTP, Google OAuth, password reset, token refresh |
| `users.js` | 9 | current user, onboarding, password, avatar, user list, approval, role, delete |
| `tickets.js` | 10 | list/detail tickets, activity, ask AI, create, assign, route, status, rating |
| `chat.js` | 5 | conversations, messages, image messages, unread count |
| `categories.js` | 3 | list/create/update categories |
| `comments.js` | 3 | list/create/delete ticket comments |
| `notifications.js` | 2 | notifications and AI decision logs |
| `auditLogs.js` | 1 | audit log list for admin/HR oversight |
| `index.js` | 1 | health check |

## Database

Database engine: **PostgreSQL**.

Schema file currently present: `backend/db/DDL.sql`.

The schema enables `pgcrypto` for UUID generation and password hashing helpers such as `crypt()` / `gen_salt()`.

Database object counts:

| Object type | Count |
| --- | ---: |
| Enum types | 6 |
| Tables | 13 |
| Views | 1 |
| Indexes | 13 |

Enum types:

| Enum | Values |
| --- | --- |
| `user_role` | `user`, `admin`, `super_admin` |
| `user_status` | `pending`, `active`, `suspended` |
| `ticket_type` | `software`, `bug`, `incident` |
| `ticket_priority` | `P1`, `P2`, `P3`, `P4` |
| `ticket_status` | `open`, `assigned`, `in_progress`, `resolved`, `closed`, `on_hold`, `pending_routing` |
| `oauth_provider` | `google` |

Tables:

| Table | Purpose |
| --- | --- |
| `users` | Accounts, roles, approval status, profile, avatar, onboarding |
| `categories` | Ticket categories |
| `tickets` | Helpdesk tickets and metadata |
| `ticket_assignment` | Active and historical assignment rows |
| `satisfaction_ratings` | One rating per resolved/closed ticket |
| `audit_logs` | Admin/user/system action history |
| `ticket_comments` | Ticket comments |
| `chat_conversations` | Support inbox conversations |
| `chat_messages` | Text/image chat messages |
| `oauth_accounts` | Linked Google accounts |
| `email_verifications` | Email verification tokens and OTP hashes |
| `password_reset` | Password reset tokens |
| `sessions` | Server-side session records |

View:

| View | Purpose |
| --- | --- |
| `admin_workload` | Aggregates admin open ticket load by priority and weighted load score |

Indexes:

| Index | Purpose |
| --- | --- |
| `idx_ticket_comments_ticket` | Fetch comments by ticket/time |
| `idx_chat_conv_user` | One conversation per user |
| `idx_chat_messages_conv` | Fetch chat messages by conversation/time |
| `idx_categories_active` | Filter active categories |
| `idx_categories_name_lower_unique` | Case-insensitive category uniqueness |
| `idx_users_role_status` | Filter users by role/status |
| `idx_tickets_submitted_by` | User ticket history |
| `idx_tickets_category_id` | Ticket category joins |
| `idx_tickets_status_priority` | Queue filters |
| `idx_ticket_assignment_active` | Active assignment lookup |
| `idx_audit_logs_actor_id` | Actor audit history |
| `idx_email_verifications_user_id` | Verification lookup |
| `idx_password_reset_user_id` | Password reset lookup |

Seed data in `DDL.sql`:

| Seed data | Count |
| --- | ---: |
| Super admin users | 1 |
| Active admin users | 5 |
| Active normal users | 5 |
| Pending users/admins | 5 |
| Categories | 3 |
| Tickets | 15 |
| Ticket assignments | 10 |
| Satisfaction ratings | 3 |
| Audit logs | 3 |

`backend/db/DDL.sql` is the canonical local schema and seed file.

## Uploads And Multer

Multer is used in two backend places:

| Route | Destination | Limit | File type |
| --- | --- | ---: | --- |
| `POST /api/v1/users/me/avatar` | `backend/uploads/avatars` | 5 MB | image MIME types only |
| `POST /api/v1/chat/conversations/:id/messages/image` | `backend/uploads/chat` | 8 MB | image MIME types only |

Current local upload inventory:

| Upload area | Count |
| --- | ---: |
| `backend/uploads/avatars/` | 6 files |
| `backend/uploads/chat/` | Created automatically when chat upload route loads; may be empty |

The Express app serves uploads from `/uploads`.

## Environment Variables

The project uses root env files loaded by profile:

| File | Purpose |
| --- | --- |
| `.env.development.example` | Local development template |
| `.env.hosting.example` | Hosting/prod-like template |
| `.env.example` | Explains profile switching |
| `.env` | Legacy fallback, present locally but should not be committed with secrets |

Important variables:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `DATABASE_SSL` | Backend | Force SSL for database connection |
| `PORT` | Backend | API port, default `5000` |
| `NODE_ENV` | Backend/build | Development vs production behavior |
| `JWT_SECRET` | Backend | Access token signing |
| `JWT_REFRESH_SECRET` | Backend | Refresh token signing |
| `JWT_ACCESS_EXPIRES_IN` | Backend | Token expiry |
| `FRONTEND_URL` | Backend | CORS origin and email link origin |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` | Backend | Email delivery |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth verification |
| `GEMINI_API_KEY` | Backend | Gemini AI routing |
| `GEMINI_MODEL` | Backend | Gemini model, default `gemini-2.0-flash` |
| `VITE_API_URL` | Frontend | API base URL in browser |
| `VITE_API_PREFIX` | Frontend | API prefix, typically `/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google OAuth client ID exposed to browser |

## Tooling And Config

| Tool/config | Purpose |
| --- | --- |
| `pnpm-workspace.yaml` | Workspace includes root app and `backend` |
| `concurrently` | Runs frontend and backend together |
| `cross-env` | Sets `LUMINA_PROFILE` consistently across shells |
| `eslint.config.js` | ESLint flat config |
| `typescript`, `typescript-eslint` | Frontend TypeScript and linting |
| `vite.config.ts` | Vite, React, Tailwind, path alias |
| `vercel.json` | Vercel builds and rewrites `/api/*` and `/uploads/*` to backend |
| `fallow` | Installed dev tool for code health analysis |

Lock/install notes:

| Item | Current state |
| --- | --- |
| `pnpm-lock.yaml` | Present; lockfile has 766 package entries and 440 snapshot entries |
| `package-lock.json` | Present; npm lock has 736 package entries |
| `node_modules/` | Present locally, about 551 MB |
| `backend/node_modules/` | Present locally, about 84 MB |

Because the project declares `packageManager: pnpm@11.1.2`, pnpm should be treated as the primary package manager. The npm lockfile may be old or accidental unless the team intentionally supports both npm and pnpm.

## Main Commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install root and backend workspace dependencies |
| `pnpm dev` | Run backend and frontend in development mode |
| `pnpm dev:hosting` | Run local app using hosting profile |
| `pnpm build` | Type-check and build frontend |
| `pnpm start` | Start backend and Vite preview |
| `pnpm lint` | Run ESLint |
| `pnpm db:init` | Initialize the database from `backend/db/DDL.sql` |

## Current Gaps / Cleanup Items

| Item | Why it matters |
| --- | --- |
| Both `pnpm-lock.yaml` and `package-lock.json` exist | Can confuse installs; pick one package manager if possible |
| `multer` and `@types/multer` are listed in root package | Upload handling is backend-only, so root dependency may be unnecessary unless frontend tooling expects it |
| `backend/server.js` contains agent debug logging to `.cursor/debug-082fa8.log` | Useful during debugging, but noisy for production code |
| Several icon-only UI buttons have weak accessible labels | Found during manual UI testing; add `aria-label`s for polish |
