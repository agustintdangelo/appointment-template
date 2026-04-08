# ARCHITECTURE

## Goal
Provide a generic appointment system that can be adapted to multiple service-business verticals.

## Proposed domain entities
- Business
- Service
- StaffMember
- BusinessHours
- StaffAvailability
- BlackoutDate
- Appointment
- AdminUser

## Architectural principles
- domain remains generic
- demo content is vertical-specific
- UI copy and seed data are swappable
- booking logic lives in domain/server code, not presentational components

## Current technical approach
- Next.js App Router
- Prisma 7 for persistence
- SQLite for local development
- Zod for request validation
- date-fns for booking time calculations

## Current structure
- `app/`
  - `/` landing page
  - `/services` public services catalog
  - `/book` booking flow
  - `/book/confirmation/[appointmentId]` confirmation page
  - `/admin/appointments` basic admin list
  - `/admin/services` service CRUD
  - `/admin/staff` staff CRUD
  - `/admin/business-hours` weekly business-hours management
  - `/admin/blackout-dates` blackout-date CRUD
  - `/admin/actions.ts` admin server actions
  - `/admin/layout.tsx` shared admin shell
  - `/api/availability` slot generation endpoint
  - `/api/appointments` appointment creation endpoint
- `lib/booking.ts`
  - slot generation and confirmation-code logic
- `lib/queries.ts`
  - read models for public and admin pages
- `lib/validation.ts`
  - Zod request validation
- `lib/admin.ts`
  - admin navigation, weekday helpers, slug helpers, and datetime formatting
- `lib/prisma.ts`
  - Prisma client using the Better SQLite adapter
- `prisma/schema.prisma`
  - reusable appointment domain schema
- `prisma/seed.mjs`
  - demo business, services, staff, schedules, blackouts, and appointments
- `prisma.config.ts`
  - Prisma 7 datasource and migration config

## Booking logic overview
A slot is available only if:
- it falls within business hours
- it falls within staff availability if staff-specific
- it does not overlap blackout dates
- it does not overlap existing appointments
- it fits service duration and optional buffer rules

## Current implementation decisions
- single-business mode for the first slice
  - pages read the first business record from the database
- staff selection is required during booking
  - keeps schedule computation explicit for MVP
- business hours currently support one window per day
  - staff availability supports multiple rows per day
- slot generation uses 15-minute increments
- appointment creation rechecks availability on the server before insert
- admin CRUD uses server actions with redirect-and-revalidate flow
- services and staff members with linked appointments cannot be deleted
  - deactivation is the safe operational path
- Prisma 7 uses `prisma.config.ts` plus `@prisma/adapter-better-sqlite3`

## Extension points
In later versions this can extend into:
- multiple businesses
- payments
- reminder channels
- staff-specific services
- packages / memberships
- recurring bookings
