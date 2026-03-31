# TaskForge API — Endpoint Reference

Base URL: `https://your-deployment.onrender.com/api`

## Authentication

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

---

## Auth Endpoints

### POST /auth/register
Create a new account. **Rate limited: 10 requests / 15 min.**

**Body:**
```json
{
  "name": "Praveen Kumar",
  "email": "praveen@example.com",
  "password": "SecureP@ss1"
}
```

**Success (201):**
```json
{
  "message": "Account created successfully",
  "user": { "id": "uuid", "name": "Praveen Kumar", "email": "praveen@example.com", "role": "user" },
  "accessToken": "eyJhbG..."
}
```

**Errors:** `400` Validation failed | `409` Email already registered | `429` Rate limited

---

### POST /auth/login
Authenticate and receive tokens. **Rate limited: 10 requests / 15 min.**

**Body:**
```json
{
  "email": "praveen@example.com",
  "password": "SecureP@ss1"
}
```

**Success (200):**
```json
{
  "message": "Login successful",
  "user": { "id": "uuid", "name": "Praveen Kumar", "email": "praveen@example.com", "role": "user" },
  "accessToken": "eyJhbG..."
}
```

**Errors:** `401` Invalid credentials | `429` Rate limited

---

### POST /auth/refresh
Get a new access token using the refresh token cookie.

**Success (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbG..."
}
```

**Errors:** `401` No refresh token | `403` Token expired/revoked

---

### POST /auth/logout
Revoke refresh token and clear cookie.

**Success (200):**
```json
{ "message": "Logged out successfully" }
```

---

### GET /auth/me 🔒
Get current user profile.

**Success (200):**
```json
{
  "user": { "id": "uuid", "name": "Praveen Kumar", "email": "praveen@example.com", "role": "user", "created_at": "..." }
}
```

---

## Task Endpoints (all require auth 🔒)

### GET /tasks
List all tasks for the authenticated user.

**Query Params:**
- `status` — `active` | `completed` (optional)
- `priority` — `high` | `medium` | `low` (optional)
- `sort` — `created_at` | `due_date` | `priority` | `title` (default: `created_at`)
- `order` — `asc` | `desc` (default: `desc`)

**Success (200):**
```json
{
  "count": 3,
  "tasks": [
    { "id": "uuid", "title": "Build API", "priority": "high", "completed": false, "due_date": "2026-04-10", ... }
  ]
}
```

---

### GET /tasks/stats 🔒
Get task statistics for the authenticated user.

**Success (200):**
```json
{
  "stats": { "total": "10", "active": "7", "completed": "3", "high_priority": "2", "overdue": "1" }
}
```

---

### GET /tasks/:id 🔒
Get a single task (owner only).

**Errors:** `404` Task not found or not owned

---

### POST /tasks 🔒
Create a new task.

**Body:**
```json
{
  "title": "Build REST API",
  "description": "With JWT auth and rate limiting",
  "priority": "high",
  "due_date": "2026-04-10"
}
```

**Success (201):** Returns created task object.

---

### PUT /tasks/:id 🔒
Update a task (owner only). Supports partial updates.

**Body (any subset):**
```json
{
  "title": "Updated title",
  "completed": true
}
```

**Success (200):** Returns updated task object.

---

### DELETE /tasks/:id 🔒
Delete a task (owner only).

**Success (200):**
```json
{ "message": "Task deleted successfully", "id": "uuid" }
```

---

## Admin Endpoints (require auth + admin role 🔒👑)

### GET /admin/users
List all users with task counts.

### GET /admin/users/:id
Get user details with their tasks.

### DELETE /admin/users/:id
Delete a user account (cannot delete self).

### PATCH /admin/users/:id/role
Change a user's role.

**Body:**
```json
{ "role": "admin" }
```

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": "Error type",
  "message": "Human-readable description",
  "details": [ ... ]   // Only for validation errors
}
```

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Authentication required / token expired |
| 403 | Forbidden / insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate email) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
