# Security — Home Maintenance Manager

## Threat Model (summary)

| Threat | Mitigation |
| --- | --- |
| Credential stuffing | Rate limit login/register; bcrypt cost 12 |
| JWT theft | Short-lived access (15m); httpOnly Secure cookies; refresh rotation |
| IDOR | Server-side household membership checks on every resource |
| Mass assignment | Zod pick of allowed fields only |
| SQL injection | Prisma parameterized + tagged raw SQL |
| XSS | React escaping; CSP headers; no `dangerouslySetInnerHTML` |
| CSRF | SameSite=Lax cookies; mutating APIs require auth cookie; Origin check in production |
| File upload abuse | Size/MIME allowlist; random storage keys; no executable serving as HTML |
| Secret leakage | `.env` gitignored; no tokens in logs |
| Privilege escalation | Cannot self-assign OWNER; last OWNER protected |

## Authentication

- Passwords: bcrypt (cost factor 12)
- Access JWT: 15 minutes, HS256, secret from `JWT_ACCESS_SECRET`
- Refresh token: 30 days opaque random, stored as SHA-256 hash
- Logout revokes refresh token row
- Never log passwords, JWTs, or refresh tokens

## Authorization

Central helper:

```ts
assertHouseholdRole(userId, householdId, allowedRoles)
```

All resource routes resolve household via ownership chain (asset → household) before mutation.

## Rate Limiting

| Endpoint | Limit | Window |
| --- | --- | --- |
| POST /api/auth/login | 10 | 15 min / IP |
| POST /api/auth/register | 5 | 15 min / IP |
| POST /api/auth/refresh | 30 | 15 min / IP |
| POST document upload | 20 | 1 hour / user |

Redis preferred; in-memory fallback when Redis unavailable (documented).

## Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (app-appropriate)
- `Permissions-Policy` restrictive defaults

## Error Handling

Production responses never include stack traces. Internal errors logged with `requestId`.

## Secrets

Required env vars documented in `.env.example`. Rotate JWT secrets invalidates sessions (acceptable for this app).
