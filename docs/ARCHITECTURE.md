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
- Customer
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
- NextAuth for optional public Google / Apple OAuth sign-in

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
  - `/admin/settings` workspace settings, including the default language selector
  - `/admin/services` service CRUD
  - `/admin/staff` staff CRUD
  - `/admin/actions.ts` admin server actions
  - `/admin/layout.tsx` shared admin shell
  - `/api/availability` slot generation endpoint
  - `/api/appointments` appointment creation endpoint
  - `/api/auth/[...nextauth]` optional public customer OAuth endpoint
  - `/api/brand-assets/[assetId]` database-backed branding asset delivery
- `lib/booking.ts`
  - slot generation, confirmation-code logic, and secure management-token generation
- `lib/contact.ts`
  - reusable contact normalization and generic phone validation
- `lib/customer-auth.ts`
  - NextAuth provider configuration, customer upsert, and server-side session helper for public customers
- `lib/confirmation.ts`
  - internal placeholder for future confirmation delivery payload handling
- `lib/branding.ts`
  - branding defaults, font catalog, color derivation, contrast warnings, upload validation, and asset URLs
- `lib/queries.ts`
  - read models for public and admin pages, including cached public branding reads
- `lib/i18n.ts`
  - supported locales, translation dictionaries, locale validation, labels, date-fns locale mapping, and Spanish fallback behavior
- `lib/locale-server.ts`
  - server helpers for resolving the active public locale from cookie + business default and the admin locale from business settings
- `lib/validation.ts`
  - Zod request validation
- `lib/admin.ts`
  - admin navigation, weekday helpers, slug helpers, and datetime formatting
- `lib/prisma.ts`
  - Prisma client using the Better SQLite adapter
- `prisma/schema.prisma`
  - reusable appointment domain schema plus customer auth, booking contact, branding settings, and brand assets
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
- public customer authentication is optional
  - Google and Apple OAuth use NextAuth with JWT sessions
  - customer sessions are separate from the admin workspace
  - OAuth provider tokens are not stored in the app database
  - customer records are upserted by provider + provider account id to avoid duplicate identities for repeat sign-ins
- guest appointment creation remains available without any customer account
- appointment creation derives authenticated ownership from the server-side session, never from client-submitted customer ids
- appointment contact fields are stored separately from optional customer ownership so authenticated customers can edit the contact destination for a specific booking
- new bookings generate a high-entropy management token and store only its SHA-256 hash on the appointment as a foundation for future secure cancellation/modification links
- `lib/confirmation.ts` is a provider-free integration point for future email, SMS, WhatsApp, or other confirmation channels
- admin CRUD uses server actions with redirect-and-revalidate flow
- services and staff members with linked appointments cannot be deleted
  - deactivation is the safe operational path
- Prisma 7 uses `prisma.config.ts` plus `@prisma/adapter-better-sqlite3`
- branding is business-owned configuration
  - fonts and colors live on `Business`
  - uploaded logos and favicon live in `BrandAsset`
- localization is business-owned configuration
  - `Business.defaultLocale` stores the configured default language
  - Spanish (`es`) is the database and runtime fallback
  - English (`en`) is the second supported language in this version
  - admin pages resolve language from `Business.defaultLocale`
  - public pages resolve language from the visitor cookie first, then `Business.defaultLocale`
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

## Localization architecture

- supported locales are centralized in `lib/i18n.ts`
- translation lookup uses `t(locale, key, replacements)` and falls back to Spanish when a key or locale is missing
- language names are centralized as natural labels:
  - `es`: Español
  - `en`: English
- date formatting uses the matching date-fns locale where relevant
- the admin default selector lives at `/admin/settings` and saves through `updateDefaultLocaleAction`
- only supported locales pass validation before being saved to `Business.defaultLocale`
- the public language selector stores the visitor override in `localStorage` and in the `appointment_public_locale` cookie so server-rendered public pages can resolve the same language

## Customer authentication architecture

- OAuth is implemented with `next-auth` because the project already uses Next.js App Router and does not have an existing customer auth layer.
- The enabled providers are Google and Apple. Each provider is only registered when its client id and client secret environment variables are present.
- Required runtime variables:
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `APPLE_CLIENT_ID`
  - `APPLE_CLIENT_SECRET`
- OAuth callbacks:
  - Google: `/api/auth/callback/google`
  - Apple: `/api/auth/callback/apple`
- Apple requires external Apple Developer setup: Service ID, return URL, key/team configuration, and a signed client-secret JWT.
- The public booking form stores in-progress selections and contact fields in `sessionStorage` before OAuth redirects, then restores them when the customer returns to `/book`.
- Provider profile name/email are used only to prefill empty contact fields. The customer can still edit contact name, email, and phone before confirming.
- Admin authentication remains separate. This slice does not add admin login or authorize admin routes.

## Appointment ownership and contact model

- `Customer` stores the stable internal id plus optional name, email, image, `authProvider`, and `providerAccountId`.
- `Appointment.customerId` links authenticated bookings to a `Customer`; guest bookings leave it null.
- `Appointment.guestFullName`, `guestEmail`, and `guestPhone` preserve guest identity data when no account exists.
- `Appointment.contactEmail` and `contactPhone` are the destination fields future confirmation delivery should use.
- Existing `customerName`, `customerEmail`, and `customerPhone` are retained for compatibility with current admin and confirmation views.
- `Appointment.bookingType` records whether the booking was created as `GUEST`, `GOOGLE`, or `APPLE`.
- `Appointment.managementTokenHash` stores a hashed future management token. The raw token is only available in memory at booking time for the future confirmation sender.

## Adding another language

- add the locale code to `supportedLocales`
- add the display label and date-fns locale mapping
- add a complete dictionary beside `es` and `en`
- keep Spanish keys complete so fallback behavior stays reliable
- seed or migrate any new defaults only if the new language should replace Spanish as the product default

## Extension points
In later versions this can extend into:
- multiple businesses
- payments
- reminder channels
- staff-specific services
- packages / memberships
- recurring bookings
