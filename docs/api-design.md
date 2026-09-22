# API Design — Home Maintenance Manager

## Conventions

Base path: `/api`

### Success envelope

```json
{
  "success": true,
  "data": {}
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource was not found",
    "details": null
  }
}
```

### Common codes

| Code | HTTP |
| --- | --- |
| VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| RESOURCE_NOT_FOUND | 404 |
| CONFLICT | 409 |
| RATE_LIMITED | 429 |
| INTERNAL_ERROR | 500 |

Auth: Bearer cookie `hmm_access` (httpOnly). Refresh: `hmm_refresh`.

---

## Auth

### POST /api/auth/register
Body: `{ email, password, fullName }`  
Auth: none  
Rate limit: 5 / 15 min / IP  
Response: `{ user }` + sets cookies

### POST /api/auth/login
Body: `{ email, password }`  
Rate limit: 10 / 15 min / IP  
Response: `{ user }` + sets cookies

### POST /api/auth/refresh
Auth: refresh cookie  
Response: rotates cookies

### POST /api/auth/logout
Auth: optional  
Revokes refresh token; clears cookies

### GET /api/auth/me
Auth: required  
Response: `{ user, households: [{ id, name, role }] }`

---

## Households

### GET /api/households
Auth: required — list memberships

### POST /api/households
Body: `{ name, addressLine1?, ... }`  
Creates household + OWNER membership

### GET /api/households/:id
Auth: member

### PATCH /api/households/:id
Auth: OWNER or MANAGER

### DELETE /api/households/:id
Auth: OWNER

### GET /api/households/:id/members
Auth: member

### POST /api/households/:id/members
Body: `{ email, role }` — OWNER/MANAGER; cannot assign OWNER  
Adds existing user by email

### PATCH /api/households/:id/members/:memberId
Body: `{ role }` — OWNER only for role changes involving MANAGER; cannot demote last OWNER

### DELETE /api/households/:id/members/:memberId
Auth: OWNER (or MANAGER removing MEMBER)

---

## Assets

### GET /api/households/:id/assets
Query: `q`, `category`, `status`, `page`, `pageSize`  
Auth: member

### POST /api/households/:id/assets
Auth: OWNER/MANAGER  
Body: asset fields

### GET /api/assets/:id
Auth: member of asset household

### PATCH /api/assets/:id
Auth: OWNER/MANAGER

### DELETE /api/assets/:id
Auth: OWNER/MANAGER — soft delete

---

## Schedules

### GET /api/assets/:id/schedules
Auth: member

### POST /api/assets/:id/schedules
Auth: OWNER/MANAGER

### PATCH /api/schedules/:id
Auth: OWNER/MANAGER

### POST /api/schedules/:id/complete
Auth: member+  
Body: `{ performedAt?, cost?, vendor?, notes? }`  
Transactionally completes and advances recurrence

### DELETE /api/schedules/:id
Auth: OWNER/MANAGER — sets `is_active=false`

---

## Service Records

### GET /api/assets/:id/service-records
Query: pagination

### POST /api/assets/:id/service-records
Auth: member+

### PATCH /api/service-records/:id
Auth: OWNER/MANAGER or creator

### DELETE /api/service-records/:id
Auth: OWNER/MANAGER

---

## Warranties

### GET /api/assets/:id/warranties
### POST /api/assets/:id/warranties
### PATCH /api/warranties/:id
### DELETE /api/warranties/:id

---

## Documents

### POST /api/assets/:id/documents
`multipart/form-data` file + optional `serviceRecordId`  
Auth: member+  
Max 10MB; MIME allowlist

### GET /api/documents/:id/download
Streams from MinIO after authz

### DELETE /api/documents/:id
Soft delete + optional object retention

---

## Notifications

### GET /api/notifications
Query: `unreadOnly`, pagination

### POST /api/notifications/:id/read
### POST /api/notifications/read-all

---

## Dashboard

### GET /api/households/:id/dashboard
Returns counts, upcoming schedules, expiring warranties, recent service records, unread notification count

---

## Audit

### GET /api/households/:id/audit-logs
Auth: OWNER/MANAGER  
Query: pagination, entityType?
