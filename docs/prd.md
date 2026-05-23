# Product Requirements Document (PRD)

## Product
**Lumina** - Intelligent support ticket routing and management platform

## Document Status
- **Version:** 1.0
- **Last updated:** 2026-05-09
- **Owner:** Nachiketh Reddy

---

## 1. Purpose and Goals

### Problem Statement
Users often generate a large number of issues, whether software defects, bugs, or production incidents. IT teams spend significant time transferring these issues among team members, and resolution may or may not occur, resulting in decreased overall productivity and less effective issue management.

### Product Vision
Lumina provides a unified experience where users can submit and track support tickets while admins monitor workload, prioritize queue health, and move issues through resolution quickly.

### Business Goals
- Reduce time-to-first-action on incoming tickets.
- Improve ticket throughput and resolution predictability.
- Increase operational visibility for support admins.
- Provide a scalable base for future AI-assisted routing.

---

## 2. Target Audience and Personas

### Primary Persona: End User (Requester)
- Submits support tickets for issues or requests.
- Needs a simple, quick way to report problems and track their ticket status.
- Values transparency and timely updates on the resolution process.

### Secondary Persona: Admin / Support Operator
- Processes and responds to submitted tickets.
- Needs efficient controls to update ticket statuses, assign or reassign tickets, and communicate with users.
- Requires tools to manage ticket queues, monitor workload, and prevent bottlenecks.

### Tertiary Persona: Superadmin
- Manages admin permissions, assigning or revoking admin roles as required.
- Has visibility into the status of all users and admins across the platform.
- Oversees overall system health, ensures compliance, and can audit activity if needed.

### Internal Persona: Product / Engineering Team
- Requires a robust authentication and dashboard foundation.
- Needs clearly defined requirements to guide evolution from prototypes to production-ready solutions.

---

## 3. Scope

### In Scope (Current + MVP Hardening)
- Public landing page communicating Lumina value proposition.
- Authentication journeys:
  - Sign up
  - Login
  - Forgot password request flow (initial state)
  - OAuth login (Google, Microsoft, etc.)
- Role-based dashboard surfaces:
  - User dashboard for ticket creation and ticket tracking
  - Admin dashboard for queue monitoring, filtering, and status updates
  - Super Admin dashboard for admin management, system visibility, and auditing
- Core ticket model fields:
  - ID, title, description, category, priority, status, created date, assignee
- Ticket routing logic leveraging initial AI-assisted triaging (simple rules-based or lightweight model).
- Basic backend user authentication endpoints and user persistence.

### Out of Scope (For This PRD Version)
- Advanced AI/ML routing engine and custom model retraining pipelines beyond initial Groq integration.
- Sophisticated AI/ML retraining workflows.
- SSO/SAML/SCIM enterprise identity management.
- Email/SMS notification infrastructure at production scale.
- Multi-tenant organization management and billing.
- Native mobile applications (web app only).

---

## 4. Success Metrics

The system will be considered successful if it reliably supports its intended use cases without major blockers. Specifically, the following outcomes indicate success:
- Users are able to register, log in, and submit support tickets smoothly.
- Admin and support staff can efficiently access and manage submitted tickets.
- Ticket and user account data is reliably persisted with no loss.
- System stability is maintained, with users able to access all core features without encountering critical errors or outages.
- All MVP functionality runs end-to-end as described in scope.

---

## 5. User Stories and Functional Requirements

### Epic A: Authentication and Access

#### User Story A1 - Sign Up
As a new user, I want to create an account so I can access Lumina dashboards.

**Requirements**
- Collect email, first name, last name, password, confirm password.
- Validate email format and password minimum length.
- Block submission when validation fails and show clear errors.
- On success, direct user to login with a confirmation state.

**Acceptance Criteria**
- Required fields are enforced client-side.
- Password mismatch prevents submission.
- Successful signup response creates user record in backend.

#### User Story A2 - Login
As a returning user, I want to sign in so I can access my workspace.

**Requirements**
- Authenticate with email + password.
- Handle invalid credentials gracefully.
- Persist authenticated state (future enhancement).
- Redirect by role to user or admin dashboard.

**Acceptance Criteria**
- Missing credentials return actionable error.
- Invalid credentials return non-ambiguous error message.
- Successful login grants access to dashboard routes.

#### User Story A3 - Forgot Password
As a user, I want to request a password reset link so I can regain access.

**Requirements**
- Validate email before submission.
- Show confirmation state after request.
- Prepare integration point for email reset service.

**Acceptance Criteria**
- Invalid email is rejected with inline guidance.
- Submitted state confirms request without exposing account existence details (future security hardening).

---

### Epic B: User Ticket Management

#### User Story B1 - Create Ticket
As a user, I want to submit a new support ticket so my issue can be resolved.

**Requirements**
- Capture title, description, category, priority.
- Auto-generate ticket identifier and creation date.
- Set initial status to `open`.

**Acceptance Criteria**
- Ticket cannot be created with empty title.
- Newly created tickets appear at top of user ticket list.

#### User Story B2 - Track Tickets
As a user, I want to view my tickets and statuses so I know progress.

**Requirements**
- Display ticket list with status, category, assignee, and created date.
- Show summary stats (total/open/resolved).

**Acceptance Criteria**
- Status labels map consistently to visual cues.
- Summary cards match list state.

---

### Epic C: Admin Queue Operations

#### User Story C1 - Monitor Queue Health
As an admin, I want visibility into ticket distribution and load so I can prioritize work.

**Requirements**
- Display counts by priority (P1/P2/P3) and status.
- Show overall weighted workload indicator.
- Support filtering by status and priority.

**Acceptance Criteria**
- Filters update list deterministically.
- Counts and load indicators reflect current ticket data.

#### User Story C2 - Progress Ticket Lifecycle
As an admin, I want to move tickets through statuses so queue state remains accurate.

**Requirements**
- Transition controls:
  - `open` -> `in_progress`
  - `in_progress` -> `resolved`
  - `resolved` -> `closed`
- Update status in-place without full page refresh.

**Acceptance Criteria**
- Only valid next action is shown per ticket status.
- Updated status is immediately reflected in list and counters.

---

## 6. Non-Functional Requirements

For this school project, non-functional goals focus on delivering a stable, understandable MVP rather than enterprise-grade scale.

- **Security baseline:** Passwords should not be stored in plaintext; hashing is required before final submission/demo.
- **Performance:** Common dashboard actions (load, filter, status update) should feel responsive for classroom-scale data.
- **Accessibility:** Core forms and actions should be usable with keyboard navigation and clear labels.
- **Reliability:** API and UI errors should be handled gracefully with user-friendly feedback.
- **Maintainability:** Code should stay modular so mock flows can be replaced with real API calls without large rewrites.

---

## 7. UX and Interaction Requirements

- Clear path from landing page to sign up and login.
- Consistent copy and validation behavior across authentication screens.
- Dashboard layout should prioritize:
  - summary metrics first
  - filter/action controls second
  - ticket list and status actions third
- Empty states should explain what to do next (for example, create a ticket or clear filters).
- UI should remain clean and simple, with advanced features deferred until core workflows are stable.

---

## 8. Assumptions, Risks, and Dependencies

### Key Assumptions
- Teams begin with web-first support workflows.
- Early adopters can operate with email/password auth before enterprise SSO.
- Initial queue volume is moderate while product-market fit is validated.

### Risks
- **Security risk:** Early plaintext or weak password handling could compromise user accounts.
- **Data model risk:** Mock ticket structures may diverge from backend schema during integration.
- **Role management risk:** Incomplete route protection could allow incorrect dashboard access.
- **Delivery risk:** Limited project time may force trade-offs on advanced features or polish.

### Dependencies
- PostgreSQL availability and stable connection config.
- Backend API maturity for auth and ticket CRUD endpoints.
- Frontend integration for authenticated sessions and role-based routing.
- Future integration with email service for password reset.

---

## 9. Milestones and Phasing

### Phase 0 - Foundation (Current State)
- Landing page and core UI shells complete.
- Auth pages and dashboards available with partial backend integration.
- Base backend routes and user table initialization in place.

### Phase 1 - MVP Completion
- Replace simulated auth calls with real API integration.
- Introduce persisted ticket storage and ticket CRUD APIs.
- Enforce role-aware login and route guarding.
- Add production-grade password hashing and validation.

### Phase 2 - Functional Polish
- Add ticket assignment workflows and audit trail.
- Add notification events for key status changes.
- Add analytics instrumentation for KPI tracking.

### Phase 3 - Intelligent Routing
- Introduce scoring/routing suggestions using priority, complexity, and workload signals.
- Add confidence indicators and routing explainability surfaces.

---

## 10. Open Questions
- What is the initial source of truth for user role assignment (signup-time, admin panel, or seed config)?
- Should non-admin users see only self-created tickets or team-shared tickets?
- What SLA expectations (by priority) should Lumina enforce in v1?
- What email provider/service will back password reset and notifications?
- Which analytics platform will own KPI instrumentation?

---

## 11. Definition of Done (MVP)
- All core user journeys (signup, login, forgot password request, create ticket, view ticket status, admin status updates) run end-to-end against real backend APIs.
- Security-critical items addressed for project scope (password hashing, basic auth hardening).
- KPI events instrumented for activation, ticket creation, and admin status actions.
- Demo-ready validation completed for routing, form behavior, role access, and dashboard responsiveness.
- PRD reviewed and accepted by project team/advisor.

Categories times etc
