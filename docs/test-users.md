# Lumina Test Users

Seeded by `backend/db/DDL.sql`. Password for all `@lumina.test` accounts: **`Testpass1`**

## Role model

| System role | Who | What they do in the app |
| --- | --- | --- |
| **`admin`** | Product owners, program/product managers, HR | User directory, AI routing logs, team/org dashboards, ticket triage; **approvals are HR-only** |
| **`user`** | Developers, testers, platform/ops ICs | File tickets, track their own work |

Onboarding **department** (`Developers`, `QA`, `Managers`, `HR`) sets job title and derives system role on signup.

---

## HR — organization-wide (`admin`)

| Email | Password | Job role |
| --- | --- | --- |
| `ynrdevs@gmail.com` | `Nachiketh1` | HR |

Dashboard: **People Operations** — all tickets, charts, approvals, AI routing, user directory.

---

## Admins — PO & managers (`admin`)

| Email | Job role |
| --- | --- |
| `eve.user@lumina.test` | Product Owner |
| `manager.priya@lumina.test` | Product Manager |
| `manager.ian@lumina.test` | Program / Project Manager |

Dashboard: team progress (Developers + QA tickets), can triage routed tickets. **Ticket queue:** filter **Assigned to me** vs **All team** (no approval queue).

## System — routing only (`admin`)

| Email | Job role | Notes |
| --- | --- | --- |
| `lumina.ai@lumina.test` | Release Manager | Lumina AI staging account; not a human login for demos |

---

## Users — developers (`user`)

| Email | Job role |
| --- | --- |
| `alice.user@lumina.test` | Software Engineer / Developer |
| `dan.user@lumina.test` | Architect |
| `admin.software@lumina.test` | Software Engineer / Developer |
| `admin.platform@lumina.test` | Platform / Infrastructure Engineer |
| `admin.ops@lumina.test` | DevOps / Site Reliability Engineer |

## Users — QA / testers (`user`)

| Email | Job role |
| --- | --- |
| `qa.tester@lumina.test` | QA Engineer / Test Engineer |
| `qa.auto@lumina.test` | Automation Engineer |
| `admin.bugs@lumina.test` | QA Engineer / Test Engineer |
| `admin.qa@lumina.test` | Automation Engineer |
| `bob.user@lumina.test` | Product Designer / UX Designer |
| `carol.user@lumina.test` | Security Engineer / AppSec |

> **Note:** `admin.platform@`, `admin.software@`, etc. are legacy email prefixes — those accounts are **`user`**, not admins.

---

## Pending approval

| Email | Job role | System role |
| --- | --- | --- |
| `pending.user1@lumina.test` | Tech Lead / Lead Engineer | user |
| `pending.user2@lumina.test` | UX Researcher | user |
| `pending.user3@lumina.test` | Content Designer / UX Writer | user |
| `pending.admin1@lumina.test` | Program / Project Manager | admin |
| `pending.admin2@lumina.test` | Product Owner | admin |
