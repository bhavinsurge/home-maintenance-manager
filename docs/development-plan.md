# Development Plan — Home Maintenance Manager

## Scope

Deliver a complete, tested Home Maintenance Manager with auth, households, assets, schedules, service history, warranties, documents, reminders, dashboard, and audit logs.

## Milestones

1. Docs + schema + Docker ✅
2. Core libs (errors, auth, authz, db, logger)
3. Auth APIs + middleware
4. Household + asset APIs
5. Schedules, service records, warranties
6. Documents + MinIO
7. Dashboard + notifications + worker
8. UI pages (professional design system)
9. Seed data
10. Unit / integration / E2E tests
11. Verification gate + README + commits

## Implementation Order

Auth → Households → Assets → Schedules/Complete → Records → Warranties → Documents → Dashboard → Worker → UI → Tests

## Risks

| Risk | Mitigation |
| --- | --- |
| Prisma/Next version drift | Pin Prisma 6 |
| Local Postgres port clash | Compose maps 5433:5432 |
| MinIO complexity | Init bucket script |
| Scope creep | Stick to PRD non-goals |

## Done When

Completion gate in master prompt is fully satisfied.
