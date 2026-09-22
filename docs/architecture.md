# Architecture — Home Maintenance Manager

## System Context

```mermaid
flowchart TB
  subgraph client [Browser]
    UI[Next.js App Router UI]
  end

  subgraph app [Application]
    API[Route Handlers / API]
    MW[Auth Middleware]
    Worker[Reminder Worker]
  end

  subgraph data [Data Plane]
    PG[(PostgreSQL)]
    Redis[(Redis)]
    MinIO[(MinIO)]
  end

  UI --> MW --> API
  API --> PG
  API --> Redis
  API --> MinIO
  Worker --> PG
  Worker --> Redis
```

## Application Layers

```text
src/
  app/                 # Pages + Route Handlers
  components/          # Shared UI primitives
  features/            # Feature-scoped UI
  lib/
    auth/              # JWT, passwords, sessions
    db/                # Prisma client
    errors/            # AppError hierarchy
    http/              # Response helpers, request IDs
    authz/             # RBAC helpers
    storage/           # MinIO client
    cache/             # Redis client
    jobs/              # Reminder logic shared with worker
    validation/        # Zod schemas
    logger.ts
  services/            # Domain services (business rules)
  types/
  workers/             # Background process entry
```

## Request Flow

```mermaid
sequenceDiagram
  participant C as Client
  participant M as Middleware
  participant A as API Handler
  participant S as Service
  participant DB as PostgreSQL

  C->>M: HTTP request + cookies
  M->>M: Attach requestId, verify access JWT if present
  M->>A: Forward
  A->>A: Parse + Zod validate
  A->>S: Call domain service
  S->>S: Authorize household role
  S->>DB: Transaction / query
  DB-->>S: Result
  S-->>A: Domain result
  A-->>C: Envelope JSON + status
```

## Authentication Flow

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Auth API
  participant DB as PostgreSQL

  C->>A: POST /api/auth/login
  A->>DB: Lookup user + verify bcrypt
  A->>DB: Persist refresh token hash
  A-->>C: Set httpOnly cookies (access + refresh)
  C->>A: Authenticated API call
  A->>A: Verify access JWT
  Note over C,A: On 401 access expiry
  C->>A: POST /api/auth/refresh
  A->>DB: Validate refresh token (not revoked)
  A-->>C: Rotate tokens
```

## Reminder Worker Flow

```mermaid
flowchart LR
  Cron[Interval ticker] --> Claim[Claim due schedules / warranties]
  Claim --> Dedupe[Idempotency key check]
  Dedupe --> Notify[Insert notifications]
  Notify --> Audit[Optional audit entry]
```

## Caching Strategy

| What | Why | TTL | Invalidation | Redis down |
| --- | --- | --- | --- | --- |
| Dashboard summary per user/household | Reduce aggregate load | 30s | On asset/schedule/warranty mutation | Skip cache; query PG |
| Auth rate-limit counters | Brute-force protection | Window length | Natural expiry | In-memory fallback (single instance) |

PostgreSQL remains source of truth for all transactional data.

## Queue / Jobs Strategy

No Kafka for this project. A single worker process polls every 60s:

1. Find schedules with `next_due_at <= now + reminder_lead` and no reminder for today
2. Find warranties ending within lead window
3. Insert notifications with unique constraint on idempotency key

Retries: failed batch logged; next tick retries. No external queue broker required.

## Deployment Topology

| Component | Local | Production-ish |
| --- | --- | --- |
| Next.js UI + API | `npm run dev` | Vercel (serverless) |
| Worker | `npm run worker` | Free VM / Railway free / always-on Docker host |
| PostgreSQL | Docker | Managed free tier or self-host |
| Redis | Docker | Self-host or omit (fallback) |
| MinIO | Docker | Self-host S3-compatible |

Vercel cannot run the long-lived worker or MinIO; document separation clearly.

## Engineering Decisions

1. **Monolith Next.js API** — portfolio clarity and fewer moving parts than Nest/Express split.
2. **Household-scoped RBAC** — realistic multi-user without full SaaS tenancy complexity.
3. **Worker as separate process** — teaches job isolation without Kafka overhead.
4. **MinIO over filesystem** — demonstrates object storage patterns portably.
