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

## Iteration 3
Date/time: 2026-04-13 branding customization slice

### What changed
- added business-owned branding settings for fonts and colors
- added database-backed brand assets for logo, alternate logo, and favicon
- split public pages into a branded route group with its own layout
- added runtime public metadata and favicon handling from branding settings
- added `/admin/branding` with live preview, upload controls, and current asset previews
- added server-side branding validation for fonts, colors, contrast, file type, and file size
- added a new app route for serving stored brand assets

### Files/modules affected
- `app/layout.tsx`
- `app/globals.css`
- `app/(public)/`
- `app/admin/branding/`
- `app/admin/actions.ts`
- `app/api/brand-assets/[assetId]/route.ts`
- `lib/branding.ts`
- `lib/admin.ts`
- `lib/queries.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260413165000_add_branding_system/migration.sql`
- `prisma/seed.mjs`
- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`
- `docs/ADAPTATION_GUIDE.md`

### Schema / migration changes
- added `BrandFont` enum
- added `BrandAssetKind` enum
- extended `Business` with font and color branding fields
- added `BrandAsset` for binary branding uploads
- added the `20260413165000_add_branding_system` migration

### Decisions made
- applied branding only to public routes and kept admin operationally neutral
- used `next/font/google` for the curated font catalog and loaded all choices once at the root layout
- derived semantic theme tokens from a smaller editable set of color primitives
- stored uploads in SQLite so branding persists with the rest of the business configuration
- rejected SVG uploads in v1 because there is no sanitization pipeline
- used a cached Prisma helper so the public layout and metadata share one branding read per request

### Open issues / risks
- admin auth is still missing, so branding controls remain operationally exposed in the same way as the rest of admin
- favicon preview quality depends on browser support for the uploaded file type
- public page marketing copy is still demo-oriented even though branding is now configurable

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 4
Date/time: 2026-04-13 services and staff admin browsing refresh

### What changed
- replaced the split services admin layout with a full-width control panel plus collection browser
- rebuilt the staff admin page with the same collection pattern
- added card and compact list views for both services and staff
- moved service and staff create/edit flows into reusable modals
- switched service and staff mutations from redirect-driven notices to structured server-action form state
- persisted the selected card/list view in session storage for each module
- refined the shared admin list header so the controls align more cleanly and custom-styled selects match the rest of the admin design
- replaced header-level add actions with first-item add cards/rows, changed edit actions to pencil buttons, and simplified sort/view controls to icon buttons

### Files/modules affected
- `app/admin/components/`
- `app/admin/services/page.tsx`
- `app/admin/services/services-manager.tsx`
- `app/admin/staff/page.tsx`
- `app/admin/staff/staff-manager.tsx`
- `app/admin/actions.ts`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- kept services and staff pages as server entrypoints that hand data to client managers
- used one shared top control panel pattern for search, status filter, sort, add CTA, and view toggle
- used modal-based create and edit flows for both services and staff instead of inline editors or dedicated edit pages
- kept filtering, sorting, and view toggling client-side because the current admin collections are already fully loaded
- preserved existing service and staff validation rules and delete constraints

### Open issues / risks
- admin auth is still missing, so the new modal CRUD remains operationally exposed in the same way as the rest of admin
- very large collections may eventually need pagination or server-side querying instead of local collection filtering
- staff-specific availability CRUD and appointment status editing are still pending

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 5
Date/time: 2026-04-14 admin calendar workspace

### What changed
- replaced the standalone blackout-date page with a new `/admin/calendar` scheduling workspace
- added day, week, and month calendar views for appointments and blackout dates
- rendered blackout dates directly inside the calendar with visuals distinct from appointments
- moved blackout management into the same page with searchable filters, card/list browsing, and modal create/edit/delete flows
- updated admin routing so the calendar is the primary scheduling entry point while the legacy blackout route redirects forward
- switched blackout mutations to structured server-action form state so the calendar and blackout browser refresh together without redirect-driven editing

### Files/modules affected
- `app/admin/calendar/`
- `app/admin/blackout-dates/page.tsx`
- `app/admin/page.tsx`
- `app/admin/actions.ts`
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
- kept the existing `BlackoutDate`, `Appointment`, `BusinessHours`, and `StaffAvailability` models unchanged and reused them in the calendar workspace
- made `/admin/calendar` the primary scheduling surface and kept `/admin/appointments` as the simpler queue view
- reused the newer admin collection patterns for blackout browsing: search, filters, card/list views, and modal-based editing
- kept the calendar implementation dependency-light by building the views with existing stack primitives instead of adding a third-party calendar package
- preserved the current app-wide date handling assumptions instead of introducing a separate timezone conversion layer in this slice

### Open issues / risks
- admin auth is still missing, so the new calendar and blackout controls remain operationally exposed in the same way as the rest of admin
- very large appointment histories may eventually need range-based server querying instead of loading the full dataset into the calendar client
- staff-specific availability still has no dedicated admin CRUD, so the calendar can visualize those windows but not edit them yet

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 6
Date/time: 2026-04-14 calendar workspace refinement

### What changed
- refactored the calendar page into a simpler vertical flow with a compact control bar, dominant calendar surface, smaller legend and period snapshot cards, and one combined scheduling-configuration section
- removed the calendar metrics row plus the heavier side detail panels so the calendar stays visually primary
- moved business-hours editing into the calendar workspace with modal-based editing and a structured list that matches the Staff and Services admin patterns
- kept blackout management inside the same bottom configuration section while simplifying its controls and preserving card/list browsing plus modal create/edit/delete flows
- removed business-hours navigation as a primary admin destination and changed the legacy business-hours page into a redirect to the calendar workspace

### Files/modules affected
- `app/admin/calendar/page.tsx`
- `app/admin/calendar/calendar-manager.tsx`
- `app/admin/business-hours/page.tsx`
- `app/admin/actions.ts`
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
- kept the calendar itself as the dominant page element and moved secondary context below it instead of alongside it
- preserved the existing appointment, blackout, and business-hours data models instead of creating parallel calendar-specific configuration models
- reused the existing modal and collection primitives for blackout and business-hours editing to keep the admin UX consistent
- retained the legacy `/admin/blackout-dates` and `/admin/business-hours` routes only as redirects so old paths do not break while the calendar remains the sole active configuration surface

### Open issues / risks
- admin auth is still missing, so the consolidated schedule controls remain operationally exposed in the same way as the rest of admin
- very large appointment histories may still eventually need range-based server querying instead of loading the full dataset into the calendar client
- staff-specific availability still has no dedicated admin CRUD, so the calendar can visualize those windows but not edit them yet

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 7
Date/time: 2026-04-14 calendar usability polish

### What changed
- fixed the day/week time grid so the first visible hour label no longer sits directly on top of the hour divider line
- adjusted the week/day grid layout to fit the visible columns into the available page width instead of forcing horizontal scrolling for the week view
- separated blackout-date management and business-hours management into distinct configuration cards while keeping both inside the calendar workspace
- kept the same calendar data, blackout logic, and business-hours logic while refining presentation and layout only

### Files/modules affected
- `app/admin/calendar/calendar-manager.tsx`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- moved hour labels into the center of each time row so the grid lines stay visually clean
- removed the fixed minimum width from the week/day grid so the full week stays visible in the calendar area
- preserved the shared scheduling workspace but split blackout dates and business hours into separate visual containers to reduce clutter

### Open issues / risks
- very dense schedules can still make week-view event cards visually tight because the full-week fit now prioritizes seeing the entire week without scrolling
- staff-specific availability still has no dedicated admin CRUD, so the calendar can visualize those windows but not edit them yet

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 8
Date/time: 2026-04-14 calendar terminology and control cleanup

### What changed
- removed the redundant "Time" label from the day/week calendar grid header
- reused the same shared card/list toggle button across blackout dates, staff, and services
- restored "blackout dates" terminology across the calendar workspace and related admin feedback
- removed the duplicate add button from the blackout-dates header and kept creation inside the collection itself
- wrapped the calendar settings intro in the same card shell pattern used by the rest of the workspace

### Files/modules affected
- `app/admin/calendar/calendar-manager.tsx`
- `app/admin/calendar/page.tsx`
- `app/admin/components/admin-list-header.tsx`
- `app/admin/components/collection-view-mode-button.tsx`
- `app/admin/actions.ts`
- `app/admin/staff/staff-manager.tsx`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- extracted the collection view toggle into a shared component so the same interaction pattern is used consistently across admin modules
- kept blackout-date creation inside the card/list collection to avoid competing calls to action
- aligned the scheduling copy back to the `BlackoutDate` domain naming without changing the underlying data model or blackout logic

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 9
Date/time: 2026-04-14 agent guidance alignment

### What changed
- updated `AGENTS.md` so the repository guidance now reflects the calendar-first scheduling workspace
- clarified that business hours and blackout-date management live inside `/admin/calendar`
- added current implementation anchors for the scheduling admin flow and the legacy redirect routes

### Files/modules affected
- `AGENTS.md`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- treated the unified calendar workspace as the primary scheduling pattern for future changes
- documented legacy scheduling routes as compatibility redirects instead of active admin workflows

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing
