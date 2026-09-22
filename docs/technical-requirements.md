# Technical Requirements — Home Maintenance Manager

## Stack

| Layer | Technology | Justification |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 | Developer familiarity; SSR/API colocation; free deploy to Vercel |
| Backend | Next.js Route Handlers | Single deployable for portfolio; TypeScript end-to-end |
| ORM | Prisma 6 + selective raw SQL | Migrations, type safety; raw SQL for aggregates / locking |
| Database | PostgreSQL 16 | Primary source of truth |
| Cache / rate limit | Redis 7 | Auth rate limiting; optional dashboard cache |
| Object storage | MinIO | S3-compatible local file storage (free) |
| Jobs | Dedicated Node worker process | Reminder generation without blocking HTTP |
| Auth | bcrypt + jose (JWT) + refresh tokens in DB | Professional auth without paid IdP |
| Validation | Zod | Shared request/response schemas |
| Logging | pino | Structured JSON logs |
| Tests | Vitest + Playwright | Unit/integration + E2E |

## Functional Requirements Mapping

| Feature | Implementation |
| --- | --- |
| Auth | `/api/auth/*`, httpOnly cookies, middleware gate |
| Households | CRUD + membership APIs |
| Assets | CRUD with search/filter/pagination |
| Schedules | CRUD + complete action with recurrence engine |
| Service records | CRUD linked to assets |
| Warranties | CRUD with expiry queries |
| Documents | Presigned/stream upload via MinIO |
| Reminders | Worker scans due items → notifications table |
| Dashboard | Aggregated SQL queries |
| Audit | Middleware/service hooks write audit_logs |

## Non-Functional

- **Latency**: p95 list APIs < 300ms locally with seeded data
- **Consistency**: PostgreSQL transactions for schedule completion
- **Security**: See `security.md`
- **Scalability**: Stateless API; horizontal worker with advisory locks / claim tokens
- **Portability**: All infra via Docker Compose

## Environment Isolation

- Local DB name: `home_maintenance`
- Test DB name: `home_maintenance_test`
- Never target host Postgres without explicit `DATABASE_URL` pointing at Docker

## Dependencies (free / local)

All required services run via Docker. No paid APIs.
