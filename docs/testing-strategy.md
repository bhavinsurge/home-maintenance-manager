# Testing Strategy — Home Maintenance Manager

## Pyramid

1. **Unit** — recurrence engine, password helpers, RBAC pure functions, Zod schemas
2. **Integration** — API routes against PostgreSQL test DB
3. **E2E** — Playwright critical journeys
4. **Manual smoke** — docker compose up + demo script

## Unit (Vitest)

- `computeNextDueDate(frequency, from, intervalDays)`
- `hashPassword` / `verifyPassword`
- `canManageMembers(actorRole, targetRole)`
- Error mapping helpers

## Integration

Uses `DATABASE_URL` pointing at `home_maintenance_test`.

Coverage:

- Register/login/refresh/logout
- Household create + member add
- Asset CRUD + soft delete
- Schedule complete advances next due
- Unauthorized access → 401/403
- Validation errors → 400

## E2E (Playwright)

1. Register new user
2. Create household
3. Add asset
4. Create schedule
5. Complete maintenance
6. View dashboard overdue/upcoming
7. Upload document (MinIO)
8. Logout and reject protected page

## Concurrency

Schedule completion under parallel requests must not corrupt `next_due_at` (transactional update). Light parallel test with Promise.all.

## Commands

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test
```

## Definition of Done

All suites green; production build succeeds; critical E2E path passes against local Docker stack.
