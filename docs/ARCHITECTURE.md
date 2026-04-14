# ARCHITECTURE

## Goal
Provide a generic appointment system that can be adapted to multiple service-business verticals.

## Proposed domain entities
- Business
- BrandAsset
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
  - `/(public)` public route group for branded pages while keeping the same URLs
  - `/` landing page
  - `/services` public services catalog
  - `/book` booking flow
  - `/book/confirmation/[appointmentId]` confirmation page
  - `/admin/appointments` basic admin list
  - `/admin/branding` branding management page
  - `/admin/services` service CRUD
  - `/admin/staff` staff CRUD
  - `/admin/business-hours` weekly business-hours management
  - `/admin/blackout-dates` blackout-date CRUD
  - `/admin/actions.ts` admin server actions
  - `/admin/layout.tsx` shared admin shell
  - `/api/availability` slot generation endpoint
  - `/api/appointments` appointment creation endpoint
  - `/api/brand-assets/[assetId]` database-backed branding asset delivery
- `lib/booking.ts`
  - slot generation and confirmation-code logic
- `lib/branding.ts`
  - branding defaults, font catalog, color derivation, contrast validation, upload validation, and asset URLs
- `lib/queries.ts`
  - read models for public and admin pages, including cached public branding reads
- `lib/validation.ts`
  - Zod request validation
- `lib/admin.ts`
  - admin navigation, weekday helpers, slug helpers, and datetime formatting
- `lib/prisma.ts`
  - Prisma client using the Better SQLite adapter
- `prisma/schema.prisma`
  - reusable appointment domain schema plus branding settings and brand assets
- `prisma/seed.mjs`
  - demo business, branding defaults, services, staff, schedules, blackouts, and appointments
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
- branding is business-owned configuration
  - fonts and colors live on `Business`
  - uploaded logos and favicon live in `BrandAsset`
- public theming is token-driven
  - public layout sets CSS variables from branding settings
  - existing semantic Tailwind tokens (`background`, `surface`, `accent`, etc.) are derived from those variables
- branding assets are delivered through app routes instead of filesystem paths
  - this keeps uploads in the same persistence layer as the rest of the app

## Branding architecture

- `Business` stores the editable theme primitives:
  - `primaryFont`
  - `secondaryFont`
  - `primaryColor`
  - `secondaryColor`
  - `backgroundColor`
  - `textColor`
- `BrandAsset` stores binary files for:
  - main logo
  - alternate logo
  - favicon
- the public route group has its own layout
  - reads branding once per request through a cached Prisma helper
  - applies CSS variables for the public site only
  - keeps the admin shell on default neutral styling
- branding validation happens server-side in the admin action
  - allowed font list is enforced
  - colors must be valid 6-digit hex values
  - text/background contrast must be at least `4.5:1`
  - primary/background contrast must be at least `3:1`
  - upload MIME types and file sizes are restricted by asset kind

## Upload handling

- branding files are submitted through a standard multipart server action form
- validated files are stored in SQLite as `Bytes` / `BLOB`
- assets are streamed back through `/api/brand-assets/[assetId]`
- asset URLs include a version query derived from `updatedAt` so replacements bust browser cache cleanly

## Extension points
In later versions this can extend into:
- multiple businesses
- payments
- reminder channels
- staff-specific services
- packages / memberships
- recurring bookings
