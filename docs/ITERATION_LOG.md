# ITERATION LOG

## Iteration 0
Date/time: initial setup

### What changed
- repository initialized
- base planning docs created
- AGENTS.md created
- project direction defined for generic appointment template

### Files/modules affected
- AGENTS.md
- docs/PRODUCT.md
- docs/ARCHITECTURE.md
- docs/ITERATION_LOG.md
- docs/ADAPTATION_GUIDE.md

### Schema / migration changes
- none yet

### Decisions made
- first demo vertical will be a nail salon
- architecture must remain reusable for other service businesses
- stack target is Next.js + TypeScript + Prisma + SQLite

### Open issues / risks
- auth approach still undefined
- initial Prisma schema not created yet
- slot generation rules not yet implemented

### Next recommended step
- scaffold project structure and initial Prisma schema

## Iteration 1
Date/time: 2026-04-08 initial MVP scaffold

### What changed
- scaffolded the Next.js app with TypeScript and Tailwind
- added Prisma 7 configuration, initial schema, and SQLite migration
- seeded a demo business, services, staff, schedules, blackout dates, and appointments
- implemented the public landing page and services page
- implemented the booking flow with live slot generation
- implemented appointment creation with server-side revalidation
- implemented the admin appointment list
- added booking domain, query, validation, and formatting modules under `lib/`

### Files/modules affected
- `app/`
- `lib/`
- `prisma/schema.prisma`
- `prisma/seed.mjs`
- `prisma.config.ts`
- `package.json`
- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`
- `.gitignore`

### Schema / migration changes
- created models for `Business`, `Service`, `StaffMember`, `BusinessHours`, `StaffAvailability`, `BlackoutDate`, `Appointment`, and `AdminUser`
- added the `AppointmentStatus` enum
- created the initial migration at `prisma/migrations/20260408193132_init/migration.sql`

### Decisions made
- kept the first implementation in single-business mode
- required explicit staff selection in the booking flow
- used 15-minute slot increments for availability generation
- confirmed bookings immediately after successful creation
- deferred admin auth to a later iteration
- used Prisma 7 with `prisma.config.ts` and the Better SQLite adapter

### Open issues / risks
- admin auth is still missing
- business hours currently assume one continuous window per day
- pricing, currency, and timezone settings are not configurable yet
- service CRUD and schedule-management CRUD are not built yet

### Next recommended step
- implement admin CRUD for services, staff, business hours, and blackout dates

## Iteration 2
Date/time: 2026-04-08 admin management slice

### What changed
- added a shared admin layout and navigation for operations pages
- implemented admin CRUD for services
- implemented admin CRUD for staff members
- implemented weekly business-hours management
- implemented blackout-date CRUD with optional staff-specific blocks
- added admin server actions with redirect-and-revalidate behavior
- extended query helpers and admin utility helpers to support the new pages

### Files/modules affected
- `app/admin/layout.tsx`
- `app/admin/admin-ui.tsx`
- `app/admin/actions.ts`
- `app/admin/services/page.tsx`
- `app/admin/staff/page.tsx`
- `app/admin/business-hours/page.tsx`
- `app/admin/blackout-dates/page.tsx`
- `app/admin/appointments/page.tsx`
- `lib/admin.ts`
- `lib/queries.ts`
- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`
- `docs/ADAPTATION_GUIDE.md`

### Schema / migration changes
- none

### Decisions made
- kept admin CRUD server-rendered and form-based instead of adding client-heavy dashboard state
- handled business hours as one upsertable row per weekday
- blocked deletion of services and staff members that already have appointments
- kept blackout dates flexible enough for business-wide or staff-specific blocking

### Open issues / risks
- admin auth is still missing
- appointment status updates are still read-only in the UI
- staff-specific availability CRUD is still missing
- timezone handling still uses the current server/runtime timezone assumptions

### Next recommended step
- implement staff availability management and appointment status editing
