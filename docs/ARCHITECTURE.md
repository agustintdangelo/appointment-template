# ARCHITECTURE

## Goal
Provide a generic appointment system that can be adapted to multiple service-business verticals.

## Proposed domain entities
- Business
- BrandAsset
- Service
- StaffMember
- BusinessHoursDay
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
  - `/admin/calendar` unified scheduling workspace with calendar views, blackout management, and business-hours configuration
  - `/admin/appointments` basic admin list
  - `/admin/branding` branding management page
  - `/admin/services` service CRUD
  - `/admin/staff` staff CRUD
  - `/admin/actions.ts` admin server actions
  - `/admin/layout.tsx` shared admin shell
  - `/api/availability` slot generation endpoint
  - `/api/appointments` appointment creation endpoint
  - `/api/brand-assets/[assetId]` database-backed branding asset delivery
- `lib/booking.ts`
  - slot generation and confirmation-code logic
- `lib/branding.ts`
  - branding defaults, font catalog, color derivation, contrast warnings, upload validation, and asset URLs
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
- business hours now support multiple Business periods per day
  - `BusinessHoursDay` stores the open/closed state for each weekday
  - `BusinessHours` stores one or more Business periods for the same weekday
  - closed days keep their saved Business periods instead of deleting them
  - staff availability continues to support multiple rows per day
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
- services and staff admin collections now use client-side browsing state
  - search, status filter, sort, and card/list view all run against the already-fetched collection in the browser
  - create and edit happen in modals backed by server actions that return structured form state instead of redirecting
  - the selected card/list view persists in `sessionStorage` per module
- the admin calendar is now the primary scheduling surface
  - appointments and blackout dates are merged into one client-rendered calendar workspace
  - shared neutral admin shell classes keep Calendar, Staff, Appointments, Services, and Branding visually separate from public branding
  - day / week / month navigation runs in local UI state while data still comes from the existing Prisma models
  - blackout creation, editing, and deletion reuse the existing blackout schema and persistence model through modal server actions
  - business hours now use the same modal edit pattern inside the calendar workspace instead of a standalone admin page
  - business-hour editing replaces an entire day configuration at once so admins can add, remove, reorder, validate, and copy Business periods in one save
  - real-time validation keeps incomplete, overlapping, out-of-order, and overnight Business periods from being saved

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
- branding validation happens server-side in the shared branding mutation helper
  - allowed font list is enforced
  - colors must be valid 6-digit hex values
  - text/background contrast under `4.5:1` is surfaced as a warning
  - primary/background contrast under `3:1` is surfaced as a warning
  - upload MIME types and file sizes are restricted by asset kind
  - branding saves return structured state instead of redirect notices so the editor can stay in place and show save feedback inline

## Upload handling

- the admin branding form posts `multipart/form-data` to `/api/admin/branding`
- the route handler reuses the shared branding mutation helper so validation, persistence, and saved-asset shaping stay in one place
- validated files are stored in SQLite as `Bytes` / `BLOB`
- assets are streamed back through `/api/brand-assets/[assetId]`
- asset URLs include a version query derived from `updatedAt` so replacements bust browser cache cleanly
- the public branding read model uses a tagged cache so layout and metadata can share one snapshot per render, and branding saves explicitly revalidate that tag

## Extension points
In later versions this can extend into:
- multiple businesses
- payments
- reminder channels
- staff-specific services
- packages / memberships
- recurring bookings
