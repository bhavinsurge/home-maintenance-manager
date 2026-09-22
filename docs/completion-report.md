# Project 1 Completion Report

```text
Project: Home Maintenance Manager (Homestead Keep)
Status: COMPLETE — completion gate passed

Architecture: Next.js 16 monolith (UI + Route Handlers) + PostgreSQL + Redis + MinIO/local storage fallback + reminder worker
Database: PostgreSQL 16 via Docker (host :5434), Prisma migrations, justified indexes, seed data
Backend: TypeScript services for auth, households/RBAC, assets, schedules, warranties, documents, dashboard, audit, notifications
Frontend: Professional Homestead Keep UI (Outfit + Source Sans 3, teal/slate system) with loading/empty/error states

Major features:
- Auth register/login/logout/refresh (bcrypt + JWT access + hashed refresh cookies)
- Households with OWNER/MANAGER/MEMBER RBAC
- Assets CRUD + soft delete + search/filter/pagination
- Recurring maintenance schedules + transactional completion
- Warranties, service history, document uploads
- Reminder worker with idempotent dispatch → in-app notifications
- Dashboard aggregates + audit log

Authentication: JWT access (15m) + rotating refresh tokens in DB; httpOnly cookies
Authorization: Server-side household membership + role rank helpers
Caching: Redis dashboard cache (30s) with PG fallback when Redis down
Queues: Dedicated reminder worker (poll + idempotency keys); no Kafka
Rate limiting: Auth + upload endpoints via Redis (in-memory fallback)
Testing: Unit 8/8, Integration 1/1, E2E 1/1 passed; production build succeeded

Security: Secure headers middleware, Zod validation, no plaintext passwords, secrets in env, IDOR prevented via membership checks
Performance: Partial/composite indexes for overdue schedules, asset lists, notifications; paginated lists
Deployment: Vercel-ready Next app (vercel.json); worker/Postgres/Redis/MinIO documented as separate infra; local Docker Compose

Known limitations:
- MinIO image pull was blocked/slow on this machine; app auto-falls back to `.data/uploads` filesystem storage
- App runs on port 3005 (3000 occupied by Grafana locally)
- In-app notifications only (no paid email)
- Membership invite requires existing registered user

Important engineering decisions:
- Isolated Docker ports 5434/6380/9010 to avoid conflicting with existing local stacks
- Soft-delete assets/documents to preserve history
- Schedule completion in a single Postgres transaction
- Local storage fallback so document workflows remain demoable without MinIO

Files created/changed: under `01-home-maintenance-manager/` (docs, prisma, src, tests, docker)

How to run locally:
  cd 01-home-maintenance-manager
  cp .env.example .env
  docker compose up -d --pull never postgres redis
  # optional: docker compose up -d minio minio-init
  npm install
  npx prisma migrate deploy
  npm run db:seed
  npm run dev          # http://localhost:3005
  npm run worker       # separate terminal

Demo login: alex@example.com / Password123!

How to run tests:
  npm run test:unit
  npm run test:integration
  npm run build && npm run test:e2e

How to deploy:
  See docs/deployment.md — Next.js to Vercel; run worker + Postgres + Redis + object storage separately on free/local infra.
```
