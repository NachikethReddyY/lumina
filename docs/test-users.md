# Lumina Test Users

Seeded by `backend/db/seed.sql`. Password for all accounts: **`Password1!`**

## Role model

| System role | Who | What they do |
| --- | --- | --- |
| **`admin`** | IT support staff (Developers, QA, Managers, HR) | Ticket queue, assignments, routing, user approvals (HR only) |
| **`user`** | Employees | Submit tickets, track their own tickets |

---

## HR — organization-wide (`admin`)

| Email | Password | Job title | Department |
| --- | --- | --- | --- |
| `ynrdevs@gmail.com` | `Password1!` | HR Director | HR |

Dashboard: **People Operations** — all tickets, charts, approvals, AI routing logs, user directory.

---

## Manager (`admin`)

| Email | Job title | Department |
| --- | --- | --- |
| `david.kim@lumina.test` | IT Service Delivery Manager | Managers |

Sees team queue, can reroute tickets across teams.

---

## Developers (`admin`)

| Email | Job title | Department |
| --- | --- | --- |
| `alex.johnson@lumina.test` | Senior Software Engineer | Developers |
| `maria.garcia@lumina.test` | Software Engineer | Developers |
| `james.wilson@lumina.test` | Full Stack Developer | Developers |

---

## QA (`admin`)

| Email | Job title | Department |
| --- | --- | --- |
| `priya.sharma@lumina.test` | QA Lead | QA |
| `tom.brown@lumina.test` | QA Engineer | QA |

---

## Regular users (`user`)

| Email | Job title |
| --- | --- |
| `emily.davis@lumina.test` | Product Designer |
| `michael.lee@lumina.test` | Marketing Coordinator |

---

## Special accounts

| Email | Status | Notes |
| --- | --- | --- |
| `lumina.ai@lumina.test` | suspended | System account for AI routing; not a human login |
| `pending.user@lumina.test` | pending | Awaiting HR approval |
| `jane.doe@lumina.test` | suspended | Former employee |
