# Product Requirements — Home Maintenance Manager

## Overview

Home Maintenance Manager helps households track property assets, warranties, recurring maintenance, service history, and document attachments so owners never miss critical upkeep.

## Problem Statement

Households own appliances, vehicles, HVAC systems, and other assets that require scheduled maintenance, warranty awareness, and service history. Paper manuals, scattered receipts, and calendar reminders fail when assets multiply or households share responsibility.

## Goals

1. Give households a single system of record for assets and maintenance.
2. Surface upcoming and overdue work before failures occur.
3. Preserve warranty and service evidence with searchable history.
4. Support multi-member households with clear ownership and permissions.
5. Deliver a production-quality UX suitable for a portfolio demonstration of professional engineering.

## Non-Goals

- Mobile native apps
- Contractor marketplace / booking
- IoT device telemetry
- Multi-tenant SaaS billing
- Paid notification providers (SMS/email SaaS)

## Personas

| Persona | Needs |
| --- | --- |
| Homeowner (Owner) | Full control of household, assets, members, documents |
| Household Manager | Manage assets, schedules, service records; invite/remove members with limits |
| Household Member | View assets, log completed maintenance, upload documents |
| Guest (unauthenticated) | Register / sign in only |

## User Roles (RBAC)

| Role | Scope |
| --- | --- |
| `OWNER` | Full household control including delete household, manage members, all CRUD |
| `MANAGER` | CRUD assets, schedules, records, warranties, documents; manage non-owner members |
| `MEMBER` | Read household data; create/update service records and documents; mark schedules complete |

Authorization is enforced server-side per household membership.

## Core Features

### Authentication
- Register, login, logout
- Password hashing (bcrypt)
- JWT access tokens + httpOnly refresh cookies
- Token refresh and logout/revocation via refresh-token table

### Household / Property Management
- Create and update households (properties)
- Address and property metadata
- Membership invitation by email (local acceptance flow)
- Soft-aware audit of membership changes

### Asset Management
- CRUD assets (appliances, vehicles, equipment, other)
- Category, make, model, serial, purchase date, location notes
- Status: `ACTIVE`, `RETIRED`, `DISPOSED`

### Maintenance Schedules
- One-time and recurring schedules
- Frequency: `ONCE`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`, `CUSTOM_DAYS`
- Next due date computation
- Overdue detection

### Maintenance / Service History
- Log completed work linked to asset and optional schedule
- Cost, vendor, notes, performed date
- Completing a schedule advances next due date

### Warranty Tracking
- Warranty periods with start/end dates
- Provider and coverage notes
- Expiring-soon surfacing on dashboard

### Document Attachments
- Upload manuals, receipts, warranties (MinIO)
- MIME/size validation
- Per-asset and per-record association

### Reminders & Notifications
- Background worker scans due schedules and expiring warranties
- In-app notifications (no paid email required)
- Deduplication / idempotency per reminder window

### Dashboard
- Counts: assets, overdue maintenance, upcoming (7/30 days), expiring warranties
- Recent activity feed
- Quick links to critical items

### Search / Filter / Pagination
- Assets by name, category, status, household
- Schedules by status (upcoming/overdue/completed)
- Service history by date range and asset

### Audit History
- Append-only audit log for create/update/delete of key entities
- Actor, action, entity type/id, metadata JSON, timestamp

## Business Rules

1. A user must belong to a household to access its data.
2. Only `OWNER` may delete a household.
3. Soft-delete is used for assets and documents where history must remain referencable; hard-delete for draft/orphan records only when safe.
4. Completing a recurring schedule creates a service record and computes the next due date.
5. Warranty end date must be >= start date.
6. File uploads max 10 MB; allowlisted MIME types only.
7. Reminder jobs must be idempotent for a given (schedule/warranty, day) pair.

## Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Availability | Local Docker stack boots with one compose command |
| Performance | List endpoints paginated; dashboard aggregates indexed |
| Security | AuthN/AuthZ, rate limits on auth, no secret leakage |
| Observability | Structured logs with request IDs |
| Accessibility | Keyboard-reachable forms, labeled inputs, contrast |
| Maintainability | Clear module boundaries, Zod validation, Prisma + raw SQL where needed |

## Failure Scenarios

- Redis unavailable → rate limiting falls back to in-memory (dev) or fails open with warning; core CRUD continues
- MinIO unavailable → document upload returns clear error; rest of app works
- Worker down → reminders pause; schedules remain correct when worker resumes
- Concurrent schedule completion → transactional update of next due date
- Invalid JWT / revoked refresh → 401 with re-auth

## Edge Cases

- Household with zero assets
- Asset with no schedules
- Schedule frequency CUSTOM_DAYS with interval 0 (rejected)
- Warranty already expired
- Member removed mid-session
- Duplicate reminder generation across worker restarts
- Large document rejection

## Success Metrics (portfolio demo)

- Full register → household → asset → schedule → complete → reminder → document flow works E2E
- Unauthorized access returns 403
- Concurrent-safe schedule completion
- Test suite green; production build succeeds
