# Tickets API & AI Routing Trigger Implementation

**Date:** May 2, 2026  
**Status:** ✓ Complete

---

## Overview

Implemented tickets API endpoints (GET, POST, PATCH) and AI routing trigger. Tickets created with `pending_routing` status. AI routing runs async, analyzes ticket, assigns to admin, updates ticket to `assigned` status. Frontend receives ticket without routing metadata.

---

## Changes Made

### 1. Tickets API Routes

**File:** `backend/routes/tickets.js` (NEW)

#### `GET /tickets` — List all tickets
- Auth required (Bearer token)
- Returns all tickets ordered by creation desc
- No filtering (frontend handles filtering)
- Response: Array of ticket objects (no routing_metadata)

#### `GET /tickets/:id` — Get single ticket
- Auth required
- Returns ticket by ID
- Response: Single ticket object (no routing_metadata)

#### `POST /tickets` — Create ticket + trigger AI routing
- Auth required
- Body: `{ title, description, category_id, type, priority, replication_steps (optional) }`
- Creates ticket with `status: pending_routing`
- Returns ticket immediately with `pending_routing` status
- **Triggers AI routing async** (doesn't wait for AI response)
- AI runs in background, updates ticket to `assigned` after decision

#### `PATCH /tickets/:id` — Update ticket
- Auth required
- Body: `{ status, priority, description }` (all optional, at least one required)
- Returns updated ticket
- Used for status changes after creation

---

### 2. AI Routing Trigger

**File:** `backend/utils/aiRouter.js` (NEW)

#### Flow:
1. **Fetch Admins:** Query DB for all active admins/super_admins
2. **Build Prompt:** Construct AI prompt with ticket details + admin list
3. **Call OpenRouter:** Send to OpenRouter API (meta-llama/llama-2-7b-chat)
4. **Parse Response:** Extract JSON from AI response
5. **Validate:** Ensure assigned user is in admin list
6. **Update Ticket:** Set status to `assigned`, update priority/category, store routing_metadata
7. **Create Assignment:** Create ticket_assignment record linking ticket to assigned admin

#### AI Decision Stored in `routing_metadata`:
```json
{
  "ai_decision": {
    "category_id": "<UUID>",
    "priority": "P1|P2|P3|P4",
    "assigned_to_user_id": "<admin UUID>",
    "reasoning": "explanation"
  },
  "routed_at": "ISO timestamp",
  "ai_model": "meta-llama/llama-2-7b-chat"
}
```

#### Constraints:
- AI can only assign to existing active admins
- AI validates to ensure assigned user ID is real
- If AI response malformed or validation fails, logs error but doesn't crash
- Runs async — doesn't block ticket creation response

---

### 3. Route Mounting

**File:** `backend/server.js` (UPDATED)

```javascript
app.use('/tickets', require('./routes/tickets'));
```

Routes now active on `/tickets`.

---

## Frontend Integration

Tickets API:

```javascript
// Create ticket
POST http://localhost:5000/tickets
Body: { title, description, category_id, type, priority, replication_steps }
Response: { id, title, ..., status: "pending_routing", created_at }

// List tickets
GET http://localhost:5000/tickets
Response: [{ id, title, ..., status, ... }]

// Update ticket
PATCH http://localhost:5000/tickets/:id
Body: { status, priority, description }
Response: { updated ticket }
```

**Note:** `routing_metadata` never sent to frontend — only stored server-side for audit/debugging.

---

## AI Routing Details

**Model:** meta-llama/llama-2-7b-chat (via OpenRouter)  
**Temperature:** 0.3 (low randomness, deterministic)  
**Prompt:** Includes ticket title, description, type, category, and list of available admins with names/emails  
**Validation:** Assigned admin ID must exist in active admins list

**Example AI Output:**
```json
{
  "category_id": "550e8400-e29b-41d4-a716-446655440000",
  "priority": "P2",
  "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440001",
  "reasoning": "Software issue requiring junior developer review. Medium priority based on description."
}
```

---

## Database Changes

No schema changes. Uses existing tables:
- `tickets` — stores ticket with `status`, `priority`, `category_id`, `routing_metadata` JSONB
- `ticket_assignment` — links ticket to assigned admin user

---

## Error Handling

- Missing required fields → 400
- Ticket not found → 404
- Database errors → 500
- AI routing failures → logged to console, ticket stays in `pending_routing` (recoverable)
- Invalid AI response → logged, ticket not updated

---

## Testing Results

Server startup:
```
✓ Database connected
✓ Database schema already exists
✓ Server running on http://localhost:5000
✓ Environment: development
```

Routes loaded successfully. Ready for API testing.

---

## Files Created/Modified

| File | Action | Status |
|------|--------|--------|
| `backend/routes/tickets.js` | Created | ✓ |
| `backend/utils/aiRouter.js` | Created | ✓ |
| `backend/server.js` | Updated (route mount) | ✓ |

---

## Next Steps

1. **OAuth Integration** — Configure OAuth provider (Google/GitHub/etc)
2. **Frontend Connection** — Wire up ticket creation/listing UI to API
3. **Future: AI Routing Refinement** — Tune OpenRouter model, adjust prompts, monitor routing accuracy

---

## Known Issues / Notes

- AI routing is async and silent on failure. Consider adding webhook/notification system for failed routing in future
- `ticket_assignment.assigned_by_user_id` set to NULL for AI-assigned tickets (could track as "system" user if needed)
- OpenRouter API key required in `.env` — already configured
- AI model choice is cost-effective; can upgrade to better model later if needed

