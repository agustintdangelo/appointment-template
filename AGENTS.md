# AGENTS.md

This repository contains a reusable appointment-booking app template for service businesses.

The first demo vertical is a nail salon, but the app must remain generic enough to adapt to:
- beauty centers
- barbershops
- spas / massage
- tattoo studios
- consultants / session-based services
- any business that sells time slots

## Core product intent
Build a simple, practical booking app with:
- a public booking flow for customers
- an admin area for managing services, staff, schedules, and appointments
- an admin branding workspace for fonts, colors, logos, and favicon
- a codebase that is easy to rebrand and extend

## Stack defaults
Prefer these unless there is a strong reason not to:
- Next.js
- TypeScript
- Tailwind
- Prisma
- SQLite for local development
- Zod
- date-fns

Keep the stack simple.
Do not add unnecessary infrastructure.

## Architecture principles
- Keep the domain generic.
- Keep demo content separate from core logic.
- Prefer explicit, maintainable code.
- Avoid overengineering.
- Do not hardcode "nails" into core entities or business logic.
- Favor configuration and seed data over special-case logic.
- Keep business logic outside presentational UI components.
- Keep branding centralized in shared settings and theme helpers.
- Apply public theming through tokens / CSS variables instead of scattered one-off classes.

## Domain model guidance
The app will typically revolve around entities like:
- Business
- BrandAsset
- Service
- StaffMember
- BusinessHours
- StaffAvailability
- BlackoutDate
- Appointment
- AdminUser
- Settings / Branding

These entities should remain reusable across appointment-based verticals.

## Public/customer MVP expectations
The public side should support:
- landing page
- services list
- booking flow
- availability selection
- booking confirmation
- runtime branding driven by persisted business settings

## Admin MVP expectations
The admin side should support:
- simple admin auth
- dashboard
- calendar workspace with day / week / month views
- branding management for public fonts, colors, logo assets, and favicon
- service CRUD
- staff CRUD
- business hours management inside the calendar workspace
- staff schedule management
- blackout-date management inside the calendar workspace
- appointment list
- appointment status updates

## Booking logic rules
Availability must be derived from:
- business working hours
- staff working hours
- service duration
- service buffer time if present
- blackout dates
- existing appointments

Avoid fake availability.

## Branding rules
Branding is a first-class feature in this template.

- `Business` owns the editable branding primitives:
  - `primaryFont`
  - `secondaryFont`
  - `primaryColor`
  - `secondaryColor`
  - `backgroundColor`
  - `textColor`
- `BrandAsset` stores uploaded branding files:
  - main logo
  - alternate logo
  - favicon
- public branding is applied at runtime from persisted settings
  - use `lib/branding.ts` for defaults, normalization, validation, contrast logic, derived tokens, and asset URLs
  - use `app/(public)/layout.tsx` to apply public branding CSS variables
  - keep admin pages operationally neutral unless a task explicitly calls for branded admin UI
- uploaded branding assets must stay in the current persistence layer
  - do not introduce ad hoc filesystem storage when the DB-backed asset model already exists
  - serve uploaded assets through `/api/brand-assets/[assetId]`
- font, color, and upload validation must remain server-side
  - fonts must come from the curated allowed list
  - colors must be valid 6-digit hex values
  - text/background contrast must stay readable
  - file type and file size must be validated per asset kind
- prefer semantic theme tokens over raw hex usage in components
  - use the shared background / surface / card / border / accent / highlight tokens
  - derive any new theme behavior in `lib/branding.ts` instead of hardcoding values in pages
- when styling filled accent surfaces, preserve contrast safety
  - prefer the shared helpers in `app/globals.css` such as `brand-accent-fill`, `brand-accent-outline`, `brand-on-accent`, and `brand-on-accent-muted`
  - prefer `bg-highlight-surface text-highlight-foreground` for highlight-toned notices and cards
  - do not assume dark text will remain readable on admin-selected brand colors

## Non-goals for initial versions
Do not add these unless explicitly requested:
- payments
- SMS / WhatsApp integrations
- multi-location support
- SaaS billing
- advanced RBAC
- Google/Outlook sync
- complex analytics
- microservices

## Documentation files
These files are mandatory and must stay updated:
- docs/PRODUCT.md
- docs/ARCHITECTURE.md
- docs/ITERATION_LOG.md
- docs/ADAPTATION_GUIDE.md

## Documentation rule
After every meaningful change, update docs.
At minimum, every meaningful iteration must update:
- docs/ITERATION_LOG.md

## Working style
When implementing features:
1. Read AGENTS.md and docs first
2. Inspect current code before changing architecture
3. Make a short plan before large edits
4. Work in small vertical slices
5. Keep changes cohesive
6. Extend existing systems before adding parallel ones
7. Update docs after the slice is complete
8. Verify before declaring done

## Definition of done
A task is only done when:
- the feature works end-to-end
- code is readable and consistent
- lint passes
- typecheck passes
- tests pass if tests exist
- docs are updated
- no obvious dead code remains

## Current implementation anchors
Use these existing anchors before inventing new patterns:

- public runtime branding:
  - `app/(public)/layout.tsx`
  - `app/globals.css`
  - `lib/branding.ts`
- scheduling admin flow:
  - `/admin/calendar`
  - `app/admin/calendar/`
  - `app/admin/actions.ts`
  - `lib/queries.ts`
  - keep `/admin/business-hours` and `/admin/blackout-dates` as compatibility redirects when those legacy paths still need to resolve
- branding admin flow:
  - `/admin/branding`
  - `app/admin/actions.ts`
  - `app/admin/branding/`
- persistence:
  - `prisma/schema.prisma`
  - `BrandAsset`
  - branding fields on `Business`
