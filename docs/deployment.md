# Deployment — Home Maintenance Manager

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- (Optional) Vercel CLI for frontend deploy

## Local (recommended)

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev          # terminal 1
npm run worker       # terminal 2
```

App: http://localhost:3005  
MinIO console: http://localhost:9011 (minioadmin / minioadmin)  
PostgreSQL: localhost:5434  
Redis: localhost:6380

## Environment Variables

See `.env.example` for purpose, required/optional, and examples.

## Database

```bash
npm run db:migrate
npm run db:seed
npm run db:reset    # DESTRUCTIVE — local/Docker only
```

## Build

```bash
npm run build
npm run start
```

## Vercel (frontend + API routes)

1. Push repo to GitHub / import in Vercel
2. Set env vars (DATABASE_URL must be reachable from Vercel — typically a hosted Postgres free tier or tunnel; for portfolio, prefer documenting local-first)
3. Build command: `prisma generate && next build`
4. **Limitations**:
   - Reminder worker must run elsewhere (`npm run worker`)
   - MinIO must be publicly reachable or replaced with compatible free object storage
   - Redis for rate limits optional but recommended

If Vercel auth is required interactively, the developer must run `vercel login` themselves.

## Worker Deployment

Run on any always-on free host (Fly.io free, Railway trial, or local machine):

```bash
npm run worker
```

Requires `DATABASE_URL` and optional `REDIS_URL`.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Prisma P1001 | Ensure Docker Postgres healthy; check port 5433 |
| MinIO upload fail | `docker compose ps`; recreate bucket via seed/init |
| Rate limit always 429 | Flush Redis: `docker compose exec redis redis-cli FLUSHDB` |
| JWT errors | Ensure secrets are long random strings |

## Safety

Never run `db:reset` against a non-Docker / unknown database. Confirm `DATABASE_URL` database name is `home_maintenance` or `home_maintenance_test`.
