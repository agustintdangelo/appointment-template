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
- BusinessHoursDay
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
- business hours management inside the calendar workspace, including multiple Business periods per day, preserved closed-day periods, and copy-to-days editing
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
  - use `app/(public)/[businessSlug]/layout.tsx` to apply public branding CSS variables for the active tenant
  - keep admin pages operationally neutral unless a task explicitly calls for branded admin UI
- uploaded branding assets must stay in the current persistence layer
  - do not introduce ad hoc filesystem storage when the DB-backed asset model already exists
  - serve uploaded assets through `/api/brand-assets/[assetId]`
- font, color, and upload validation must remain server-side
  - fonts must come from the curated allowed list
  - colors must be valid 6-digit hex values
  - contrast issues should surface as human-readable warnings when the product allows admin override
  - file type and file size must be validated per asset kind
- prefer semantic theme tokens over raw hex usage in components
  - use the shared background / surface / card / border / accent / highlight tokens
  - derive any new theme behavior in `lib/branding.ts` instead of hardcoding values in pages
- when styling filled accent surfaces, preserve contrast safety
  - prefer the shared helpers in `app/globals.css` such as `brand-accent-fill`, `brand-accent-outline`, `brand-on-accent`, and `brand-on-accent-muted`
  - prefer `bg-highlight-surface text-highlight-foreground` for highlight-toned notices and cards
  - do not assume dark text will remain readable on admin-selected brand colors
- branding admin saves should stay in place instead of bouncing through redirect notices
  - prefer the dedicated multipart save flow on `/api/admin/branding` for `/admin/branding`
  - keep preview assets visible until the server returns the persisted asset snapshot
  - keep success/error feedback close to the save button
  - avoid leaking framework redirect errors like `NEXT_REDIRECT` into the UI

## Admin workspace rules
The admin workspace now has a few concrete patterns that should be extended instead of replaced:

- `app/admin/page.tsx` redirects to `/admin/[businessSlug]/calendar` for the first seeded business, so calendar is the primary admin landing workspace
- use `AdminPageIntro`, `AdminNotice`, and `AdminEmptyState` from `app/admin/admin-ui.tsx` before creating new page shells
- keep the admin workspace plain and operational
  - prefer default admin typography over public display fonts
  - keep decorative branding treatment inside previews or public pages, not the admin controls themselves
  - extend the shared neutral admin primitives in `app/globals.css` and `app/admin/admin-ui.tsx` so Calendar, Staff, Appointments, Services, and Branding stay visually aligned
  - keep a shared return path to the public homepage in the admin shell so operators can leave the workspace without relying on browser navigation
  - when validation or save feedback appears in modal editors, prefer calm transitions over abrupt layout shifts
  - respect reduced-motion preferences when adding admin-side transitions or animated feedback
- services and staff pages are server entrypoints that fetch data, then pass control to client managers
  - `app/admin/services/services-manager.tsx`
  - `app/admin/staff/staff-manager.tsx`
- reusable admin browsing primitives live in `app/admin/components/`
  - `AdminListHeader`
  - `CardGrid`
  - `ListView`
  - `CreateEntityModal`
  - `CollectionViewModeButton`
  - `CollectionViewTransition`
  - collection state helpers in `admin-collection-types.ts` and `use-session-collection-view.ts`
- services and staff currently use:
  - a full-width control panel
  - card and compact list views
  - modal-based create/edit flows
  - client-side search/filter/sort on the already-fetched collection
  - session-storage persistence for view mode
  - shared motion polish for card/list and sort-driven collection updates through `CollectionViewTransition`
- do not reintroduce the older split master-detail editor layout for services or staff unless explicitly requested
- when using admin server actions for modal CRUD, prefer structured action-state responses that work with `useActionState`
  - return `status`, `message`, and field-level errors
  - keep route revalidation explicit
  - avoid redirect-driven notices when the UI is modal-based

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
  - `/admin/[businessSlug]/calendar`
  - `app/admin/calendar/`
  - `app/admin/actions.ts`
  - `lib/business-hours.ts`
  - `lib/queries.ts`
  - `BusinessHoursDay` stores weekday open/closed state while `BusinessHours` stores one or more Business periods for that weekday
  - keep `/admin/business-hours` and `/admin/blackout-dates` as compatibility redirects when those legacy paths still need to resolve
- services and staff collection browsing:
  - `app/admin/services/services-manager.tsx`
  - `app/admin/staff/staff-manager.tsx`
  - `app/admin/components/`
  - `app/admin/admin-ui.tsx`
  - `app/admin/components/collection-view-transition.tsx`
- admin shell navigation:
  - `app/admin/admin-ui.tsx`
  - include the shared tenant-aware "Back to home" action alongside admin section navigation
- branding admin flow:
  - `/admin/[businessSlug]/branding`
  - `app/admin/actions.ts`
  - `app/admin/branding/`
- persistence:
  - `prisma/schema.prisma`
  - `BrandAsset`
  - branding fields on `Business`
