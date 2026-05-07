# Lumina AI Ticketing System - Implementation Plan

## Project Overview

**Project Name**: Lumina AI Ticketing System  
**Purpose**: An intelligent ticketing platform that uses AI to route tickets based on priority and admin workload.  
**Design System**: Lumina (docs/lumina.md) - Dark mode ONLY, dual blue system, serif headlines, technical editorial style.

---

## System Architecture

### User Hierarchy

```
Super Admin
    ├── Admin 1 (e.g., 4 priority-1 tickets open)
    ├── Admin 2 (e.g., 3 priority-1 + 2 priority-2 tickets open)
    └── Admin N
         └── Users (submit tickets with priority tags)
```

### Core Roles

1. **Super Admin**
   - Full system control
   - Manage all admins and users
   - Override AI routing decisions
   - View all tickets across the system

2. **Admin**
   - Review assigned tickets
   - Address and resolve tickets
   - View their assigned ticket queue
   - Limited to their assigned tickets

3. **User**
   - Submit tickets (hardware/software/bugs)
   - Tag ticket priority (1-3, where 1 is highest)
   - Track ticket status
   - Cannot see other users' tickets

---

## Ticket System

### Ticket Categories

- **Hardware issues** (e.g., broken laptop, monitor problems)
- **Software issues** (e.g., app crashes, license problems)
- **Bugs** (e.g., system errors, unexpected behavior)

### Priority Levels

| Priority | Level | Description | Response SLA |
|----------|------|-------------|----------------|
| 1 | Critical | System down, security issues, blocking work | 4 hours |
| 2 | High | Major feature broken, multiple users affected | 24 hours |
| 3 | Normal | Minor issues, single user impact | 72 hours |

### Ticket Lifecycle

```
User submits ticket (with priority tag)
         ↓
AI Routing Engine evaluates
         ↓
Ticket assigned to Admin (based on workload + priority)
         ↓
Admin reviews and addresses ticket
         ↓
Admin resolves ticket
         ↓
User confirms resolution
         ↓
Ticket closed
```

---

## AI Routing Logic

### Input Parameters

The AI routing engine considers:

1. **Ticket Priority** (1-3)
   - Priority 1 tickets get highest weighting
   - Priority 3 tickets can be distributed more flexibly

2. **Admin Current Workload**
   - Number of open tickets per admin
   - Breakdown by priority level (how many priority-1, priority-2, etc.)

3. **Admin Capacity**
   - Maximum tickets per admin (configurable)
   - Priority-based capacity (e.g., max 5 priority-1, 10 priority-2, 15 priority-3)

### Routing Algorithm (Initial Pseudocode)

```
FOR each new ticket T with priority P:
    FOR each admin A:
        Calculate load_score[A] = 
            (count_priority_1[A] × 3) +
            (count_priority_2[A] × 2) +
            (count_priority_3[A] × 1)
    
    IF P == 1:
        // Critical tickets: assign to admin with LOWEST load_score
        assigned_admin = argmin(load_score)
    
    ELSE IF P == 2:
        // High priority: balance between load and availability
        available_admins = [A where count_priority_1[A] < max_p1]
        assigned_admin = argmin(load_score among available_admins)
    
    ELSE IF P == 3:
        // Normal priority: can go to admin with capacity
        available_admins = [A where total_open[A] < max_total]
        IF available_admins not empty:
            assigned_admin = random_choice(available_admins)
        ELSE:
            assigned_admin = argmin(load_score) // overflow to least loaded
    
    RETURN assigned_admin
```

### Example Scenario

```
Current State:
- Admin 1: 4 priority-1 tickets, 2 priority-2 tickets (load_score = 16)
- Admin 2: 3 priority-1 tickets, 2 priority-2 tickets (load_score = 13)

New Ticket: Priority 3

Decision:
- Both admins have capacity
- Admin 2 has lower load_score (13 < 16)
- Result: Assign to Admin 2
```

---

## Database Schema (Initial Draft)

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('super_admin', 'admin', 'user') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tickets Table
```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    assigned_admin_id UUID REFERENCES users(id),
    category ENUM('hardware', 'software', 'bug') NOT NULL,
    priority ENUM('1', '2', '3') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Admin Workload View
```sql
CREATE VIEW admin_workload AS
SELECT 
    u.id AS admin_id,
    COUNT(CASE WHEN t.priority = '1' THEN 1 END) AS priority_1_count,
    COUNT(CASE WHEN t.priority = '2' THEN 1 END) AS priority_2_count,
    COUNT(CASE WHEN t.priority = '3' THEN 1 END) AS priority_3_count,
    COUNT(t.id) AS total_open,
    (COUNT(CASE WHEN t.priority = '1' THEN 1 END) * 3 +
     COUNT(CASE WHEN t.priority = '2' THEN 1 END) * 2 +
     COUNT(CASE WHEN t.priority = '3' THEN 1 END) * 1) AS load_score
FROM users u
LEFT JOIN tickets t ON u.id = t.assigned_admin_id AND t.status IN ('open', 'in_progress')
WHERE u.role = 'admin'
GROUP BY u.id;
```

---

## Tech Stack (To Be Decided)

### Frontend
- **Framework**: TBD (React/Vue/Svelte)
- **Styling**: Lumina design system (docs/lumina.md)
- **State Management**: TBD

### Backend
- **Framework**: TBD (Node.js/Python/Go)
- **AI Engine**: TBD (OpenAI/Anthropic/Google AI)
- **Database**: PostgreSQL (from schema above)

### Infrastructure
- **Hosting**: TBD
- **CI/CD**: TBD

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up project repository
- [ ] Implement database schema
- [ ] Create basic API endpoints (user auth, ticket CRUD)
- [ ] Set up frontend with Lumina design system

### Phase 2: Core Ticketing (Week 3-4)
- [ ] Implement ticket submission flow
- [ ] Build user dashboard (submit, track tickets)
- [ ] Build admin dashboard (view, update tickets)

### Phase 3: AI Routing (Week 5-6)
- [ ] Implement AI routing engine
- [ ] Integrate with chosen AI provider
- [ ] Test routing logic with sample data
- [ ] Add super admin override capability

### Phase 4: Polish & Launch (Week 7-8)
- [ ] Add notifications (email/in-app)
- [ ] Implement ticket comments/attachments
- [ ] Security audit
- [ ] Deploy to production

---

## AI Prompt for Routing (Draft)

```
You are an intelligent ticketing routing system for Lumina AI Ticketing System.

Your task: Assign incoming tickets to the best available admin based on:
1. Ticket priority (1=critical, 2=high, 3=normal)
2. Admin current workload (number of open tickets by priority)
3. Admin capacity limits

Routing Rules:
- Priority 1 tickets: Assign to admin with LOWEST load score
- Priority 2 tickets: Assign to admin with capacity for priority-1 tickets
- Priority 3 tickets: Can be distributed to any admin with available capacity

Load Score Calculation:
- Priority 1 ticket = 3 points
- Priority 2 ticket = 2 points  
- Priority 3 ticket = 1 point

Input Format:
{
  "ticket": {
    "id": "uuid",
    "priority": 1-3,
    "category": "hardware|software|bug",
    "title": "...",
    "description": "..."
  },
  "admins": [
    {
      "id": "uuid",
      "priority_1_count": N,
      "priority_2_count": N,
      "priority_3_count": N,
      "total_open": N,
      "load_score": N
    }
  ]
}

Output Format:
{
  "assigned_admin_id": "uuid",
  "reasoning": "Brief explanation of why this admin was chosen"
}

Example:
Input: Priority 3 ticket, Admin1 (load=16), Admin2 (load=13)
Output: {"assigned_admin_id": "admin2-uuid", "reasoning": "Admin 2 has lower load score (13 vs 16), making them the best choice for this priority 3 ticket."}
```

---

## Success Metrics

- **Routing Accuracy**: % of tickets routed to appropriate admin (target: >90%)
- **Response Time**: Average time from ticket submission to admin assignment (target: <5 min)
- **Admin Satisfaction**: Survey feedback on workload distribution fairness
- **User Satisfaction**: Survey feedback on ticket resolution experience

---

## Next Steps

1. **Refine AI routing prompt** - Get stakeholder feedback on the draft prompt
2. **Choose tech stack** - Decide on frontend/backend frameworks
3. **Set up development environment** - Initialize repo, install dependencies
4. **Start Phase 1** - Build foundation with database + basic API

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-07  
**Maintainer**: Lumina Team
