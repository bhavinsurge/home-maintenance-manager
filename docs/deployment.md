# Deployment — Homestead Keep

## Local

```bash
yarn infra:up
yarn install
yarn db:generate && yarn db:migrate:deploy && yarn db:seed
yarn api:dev    # :4005
yarn web:dev    # :3005
yarn worker:dev
```

Compose file: `infrastructure/docker-compose.yml`

## Environment

See `.env.example`. Critical variables:

| Variable | Used by |
| --- | --- |
| `DATABASE_URL` | api, worker, database package |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | api |
| `REDIS_URL` | api (rate limit + cache) |
| `MINIO_*` | api (documents) |
| `API_URL` | web (rewrite target) |
| `NEXT_PUBLIC_APP_URL` | web |

Never commit `.env`.

## Production topology

| Component | Target |
| --- | --- |
| `apps/web` | Vercel / static Node Next host |
| `apps/api` | Node 20+ process (`yarn api:start`) |
| `apps/worker` | Node process (`yarn worker:start`) |
| PostgreSQL | Managed or Docker |
| Redis | Optional but recommended |
| MinIO | Self-hosted S3-compatible |

Vercel cannot run the Nest API or worker. Point web rewrites/`API_URL` at the public API origin, or put a reverse proxy in front so the browser stays same-origin.

## Build

```bash
yarn build
```

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Prisma P1001 | `yarn infra:up`; check port 5434 |
| Proxy 502 | Ensure API is up on 4005; check `API_URL` |
| Cookie missing after login | Use same host for web (localhost vs 127.0.0.1 consistently) |
