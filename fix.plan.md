# Lumina fix plan (execution)

**Stack:** React/Vite · Express · PostgreSQL  
**Done — skip:** AI routing (`backend/lib/ticketRouting.js`, Lumina assign on create/reroute)

**Order:** §4 schema (if dual-assign) → §3 routing → §1/8 emails → §6/7/9/10/2 UI → §5/11 seeds → §12 HR reports

---

## §3 Routing rework (largest — blocks §1 event copy)

**Goal:** QA-first default; dual ownership (1 QA + 1 Dev visible); role-specific action buttons.

| Remove | Add |
|--------|-----|
| Create-ticket `requestQaTesting` checkbox (`CreateTicketModal.tsx`) | Default Lumina route → QA (`ticketRouting.js` prompt + `chooseAssignee`) |
| `Send to QA` (`TicketDetailPanel.tsx`, `POST …/send-to-qa`) | `Route to Developer` (QA only) |
| | `Reroute to Another QA` (QA) |
| | `Reroute` (Dev) |
| | `Route to QA` (Dev) |
| | Managers: all above + org reroute |

**Schema (pick one — see Questions):**
- **A (recommended):** `ticket_assignment.assignment_role` enum `qa` \| `developer`; partial unique `(ticket_id) WHERE is_active AND assignment_role = 'qa'` (same for dev). Keep history via `is_active`.
- **B:** `tickets.metadata.assignees: { qa_id, developer_id }` — faster, weaker integrity.

**Backend touch:** `DDL.sql`, `routes/tickets.js` (`applyRoutingAssignment`, create/reroute/send-to-qa → new endpoints), `lib/ticketPermissions.js`, `lib/ticketRouting.js` (QA vs dev pools), `routes/notifications.js` queries.

**Frontend touch:** `TicketHistoryPage.tsx`, `TicketDetailPanel.tsx`, `TicketSideRail.tsx` — **People assigned:** two rows (QA + Dev); list queries must join both roles.

**Flows:**
- New ticket → QA assignee (+ optionally stage dev as pending until QA routes).
- QA-created → stays QA-first; Dev step via button.
- Dev-created → QA → Dev → QA (buttons always available to QA/Dev; not gated on creator).

---

## §1 Email notifications

**Exists:** `backend/lib/mailer.js`, `emailTemplates.js` (auth only).

| Task | Files |
|------|-------|
| `users.email_notifications BOOLEAN DEFAULT false` | `DDL.sql`, `middleware/auth.js` SELECT, `routes/users.js` PATCH |
| Settings checkbox | `AccountSettingsPage.tsx`, `apiClient.ts` |
| Send on: assign, status change, ticket update (scope: assignee + submitter), approve/reject/suspend | Hook in `routes/tickets.js`, `routes/users.js`; guard `isMailConfigured()` |
| Templates | `emailTemplates.js` |

---

## §2 Checkbox alignment

- `CreateTicketModal.tsx` + CSS — label/checkbox row for QA section (removed if §3 drops checkbox; else fix before removal).

---

## §4 Seeds: 4 ICs per specialty + comments

**Note:** Schema does not cap headcount — expand **`DDL.sql` seeds** only unless §3 adds `assignment_role`.

| Pool | Target count | Example job titles |
|------|----------------|-------------------|
| Developer IC | 4 | Software Engineer, Platform, DevOps, Architect |
| QA IC | 4 | QA Engineer, Automation, (keep design/security if needed) |
| Manager admin | 4 | PO, PM (+1) |
| HR admin | 1–2 | HR |

Update `docs/test-users.md`.

**Comments (scoped — not whole repo):** cross-layer only — `apiClient` calls, `routes/*.js` handlers, SQL in `tickets.js` / `ticketRouting.js`, §3 UI handlers.

---

## §5 “Manager” category

**Clarify target (see Questions):**
- **Ticket category** → `categories` row + create-ticket dropdown (`categories` API, `CreateTicketModal.tsx`).
- **Onboarding dept** → already `Managers` in `OnboardingPage.tsx` — no work if that’s all.

---

## §6 Admin role dropdown → server defaults

| Change | Files |
|--------|-------|
| Remove `sa-role-select` | `SuperAdminDashboard.tsx` |
| Role from department only (already on onboard PATCH) | `routes/users.js` — ensure HR/Managers→`admin`, QA/Developers→`user`; hide role from admin edit API |

---

## §7 Delete user confirm

**Exists:** `confirm()` in `SuperAdminDashboard.tsx` `handleDelete`.  
**Upgrade:** modal component (match onboarding confirm pattern) before `usersApi.delete`.

---

## §8 Termination email

- On `status → suspended` (and hard delete if required): `sendMail` + template in `emailTemplates.js`; call from `routes/users.js` approval/delete handlers.

---

## §9 Session expiry

**Mismatch today:** client idle `VITE_SESSION_TIMEOUT` default **5m** (`sessionAuth.ts`, `useSessionTimeout.ts`) vs JWT **7d** (`JWT_ACCESS_EXPIRES_IN`, `jwt.js`).

| Align to | Suggestion |
|----------|------------|
| Single source | e.g. `8h` idle client + `JWT_ACCESS_EXPIRES_IN=8h`; document in `.env.example` |
| Touch | `.env`, `sessionAuth.ts`, `jwt.js`, login sets `touchSessionActivity` |

---

## §10 In-app notifications

**Today:** `GET /notifications` = audit log rows (`notifications.js`); UI expects `ApiNotification` — works for admins with scoped query; **users** may see empty/wrong set.

| Fix | |
|-----|---|
| Define events: assign to me, status on my tickets, approval outcome | Extend SQL filters |
| Optional: `user_notifications` table + mark read (if hide-in-localStorage insufficient) | |
| Files | `notifications.js`, `AppSidebar.tsx`, poll/`revalidate` after ticket actions |

---

## §11 Proper names

Replace placeholder names in seeds/UI copy: `Alice User`, `Bob User`, `Pending UserOne`, etc.  
**Files:** `DDL.sql` seeds, `docs/test-users.md`, any hardcoded demo strings in `HomePage.tsx`.

---

## §12 HR AI report

**Exists:** `POST /reports/hr-diagnostics` → JSON (`reports.js`); HR button in `SuperAdminDashboard.tsx`.

| Build | |
|-------|---|
| Modal: Weekly / Monthly panels → Generate | `SuperAdminDashboard.tsx` |
| Bottom-left toast: “Creating report…” | overlay component |
| `POST /reports/hr-generate` { period: `7d`\|`30d` } | aggregate: audit_logs, tickets, assignee stats, avg days-to-close (reuse diagnostics SQL), workload |
| Lumina prompt → **HTML file + Markdown** (under/over performers, team table, close-time KPIs) | new `backend/lib/hrReport.js`; same API key as routing |
| Response | `{ html, markdown, filename }` — client download or preview |

---

## Open questions (answer before §3/§5/§12)

1. **§3 dual assignee:** Schema **A** (`assignment_role` column) or **B** (metadata only)?
2. **§5 Manager:** New **ticket category** named “Manager”, or onboarding-only (already done)?
3. **§4 “4 per role”:** Exactly 4 Developers + 4 QA + 4 Managers, or 4 per **job title** subtitle?
4. **§12 report:** Download `.html`/`.md` files, in-app preview, or email to HR? Same model env as routing?
5. **§7:** Keep browser `confirm` or require styled modal?
6. **§11 names:** Realistic corporate names OK, or provide a name list?

---

## Acceptance (per section)

| § | Done when |
|---|-----------|
| 1 | Toggle persists; emails fire on assign/status/approval when SMTP set |
| 2 | Checkbox aligned (or removed with §3) |
| 3 | No old QA checkbox/button; dual assignees visible; role buttons route correctly |
| 4 | ≥4 seeds per IC pool; test-users doc updated |
| 5 | Manager selectable where specified |
| 6 | No role dropdown; dept drives role |
| 7 | Delete requires explicit confirm UI |
| 8 | Suspend/delete sends email |
| 9 | Client idle + JWT TTL documented and consistent |
| 10 | Bell shows relevant events for user + admin |
| 11 | No “User/New/Pending” demo names in prod paths |
| 12 | HR generates weekly/monthly HTML+MD with KPI narrative |
