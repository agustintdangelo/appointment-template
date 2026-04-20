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

## Iteration 10
Date/time: 2026-04-17 branding admin reliability and UX pass

### What changed
- replaced the branding editor's redirect-based save flow with a structured server-action state flow
- fixed the leaked `NEXT_REDIRECT` notice by removing redirect-driven success and error handling from `/admin/branding`
- changed low-contrast branding checks from hard validation failures to advisory warnings
- kept the branding preview public-facing and branded while simplifying the branding editor and shared admin shell styling
- made saved logo and favicon state flow back into the client form so asset previews stay consistent after save without reloading the page
- moved save feedback into the button area with stable `Saving...` and `Saved` states instead of a top-level jump message

### Files/modules affected
- `app/admin/actions.ts`
- `app/admin/branding/`
- `app/admin/admin-ui.tsx`
- `app/admin/layout.tsx`
- `app/globals.css`
- `lib/branding.ts`
- `README.md`
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- branding saves now stay on the same page and return structured state instead of redirecting with query-string notices
- contrast guidance remains visible but does not block deliberate branding choices made by admins
- the admin workspace should stay neutral and readable even when the public site adopts expressive branding
- asset preview consistency is handled by returning the saved branding snapshot and versioned asset URLs from the branding action
- shared admin shell classes now enforce that neutral styling across Calendar, Staff, Appointments, Services, and Branding instead of leaving each section to style itself

### Open issues / risks
- admin auth is still missing, so branding controls remain operationally exposed in the same way as the rest of admin
- very low-contrast brand choices are now allowed by design, so readability responsibility ultimately stays with the admin

### Next recommended step
- add authentication and authorization around the admin workspace so the now-polished operational tools are properly protected

## Iteration 11
Date/time: 2026-04-17 admin control alignment polish

### What changed
- removed the native browser search decoration from admin search inputs and moved shared field padding into admin input helpers so the custom magnifier no longer overlaps placeholder text
- aligned the shared card/list view toggle with the shared sort button styling inside the services, staff, and blackout control bars
- kept the existing control behavior the same while tightening presentation only

### Files/modules affected
- `app/globals.css`
- `app/admin/components/collection-view-mode-button.tsx`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- fixed the search overlap at the shared CSS layer so every admin search field using `admin-input` benefits automatically, including inputs whose Tailwind padding utilities were being overridden by later global admin styles
- reused the same neutral button treatment for the shared view toggle so control rows stay visually consistent

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 12
Date/time: 2026-04-20 multi-window business hours

### What changed
- refactored business hours so a day can contain multiple opening windows instead of a single continuous range
- updated booking availability and calendar overlays to read all business-hour windows for a day
- replaced the single-window business-hours modal with a day editor that supports add, remove, edit, and closed-all-day behavior
- added validation for empty open days, invalid ranges, out-of-order windows, and overlapping windows
- added a migration that converts existing open business-hours rows and drops the old closed-day placeholder pattern

### Files/modules affected
- `prisma/schema.prisma`
- `prisma/migrations/20260420113000_business_hours_multi_windows/migration.sql`
- `prisma/seed.mjs`
- `lib/business-hours.ts`
- `lib/booking.ts`
- `lib/queries.ts`
- `app/admin/actions.ts`
- `app/admin/calendar/calendar-manager.tsx`
- `README.md`
- `AGENTS.md`
- `docs/ADAPTATION_GUIDE.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`
- `docs/PRODUCT.md`

### Schema / migration changes
- removed the `isClosed` column from `BusinessHours`
- removed the unique weekday constraint on `BusinessHours`
- added an index on `BusinessHours(businessId, dayOfWeek, openTime)`
- migrated existing open business-hours rows forward while omitting closed-day placeholder rows

### Decisions made
- preserved the existing `BusinessHours` model instead of introducing a separate window table
- represented closed days as the absence of business-hours windows for that weekday
- saved business hours by replacing one day’s full set of windows in a transaction, which keeps the admin editor simpler and avoids partial-day drift
- kept overlap and ordering validation in the server action so the booking engine and admin UI stay aligned

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 13
Date/time: 2026-04-20 strict business periods refinement

### What changed
- tightened the Business Hours refactor so each weekday now has an explicit closed/open day state plus up to 5 saved Business periods
- updated the calendar Business Hours editor to validate in real time, auto-sort Business periods, and show row-level inline errors instead of dropping messages under a single time input
- preserved Business periods when a day is marked closed and rendered those saved periods as inactive instead of deleting them
- added copy-to-days support so one weekday’s Business periods can replace selected target days from the same modal
- kept booking availability and calendar overlays aligned with the new day-state plus Business-period model

### Files/modules affected
- `prisma/schema.prisma`
- `prisma/migrations/20260420142000_business_hours_day_state/migration.sql`
- `prisma/seed.mjs`
- `lib/business-hours.ts`
- `lib/booking.ts`
- `lib/queries.ts`
- `app/admin/actions.ts`
- `app/admin/calendar/calendar-manager.tsx`
- `AGENTS.md`
- `README.md`
- `docs/ADAPTATION_GUIDE.md`
- `docs/ARCHITECTURE.md`
- `docs/ITERATION_LOG.md`
- `docs/PRODUCT.md`

### Schema / migration changes
- added `BusinessHoursDay` to store the open/closed state per business weekday
- kept `BusinessHours` as the persisted Business-period rows for each weekday
- backfilled one `BusinessHoursDay` row per weekday for every existing business during migration

### Decisions made
- replaced the temporary “no rows means closed” interpretation with an explicit day-state model so closed days can preserve their previously configured Business periods
- kept full-day saves transactional so editing, sorting, and copying Business periods still uses one predictable write path
- centralized Business-period validation in `lib/business-hours.ts` so the modal, server action, calendar overlay, and booking engine all reuse the same rules

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 14
Date/time: 2026-04-20 calendar feedback motion polish

### What changed
- softened the Business Hours modal feedback so validation banners and inline row errors ease in and out instead of popping into place
- added animated feedback slots and gentler panel transitions to reduce the perceived jump when Business-period validation changes the layout
- respected reduced-motion preferences so the admin workspace still behaves predictably for users who disable animations

### Files/modules affected
- `app/admin/calendar/calendar-manager.tsx`
- `app/globals.css`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- kept the strict realtime validation and save-blocking behavior unchanged while improving only the presentation layer
- added shared neutral admin motion helpers in `app/globals.css` so future modal feedback can reuse the same calmer transitions

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 15
Date/time: 2026-04-20 collection view transition polish

### What changed
- added a shared animated transition wrapper for card/list collection switches
- softened the mode swap in Services, Staff, and blackout dates so the content eases out and in instead of snapping instantly
- respected reduced-motion preferences so the transition falls back to an immediate swap when motion reduction is enabled

### Files/modules affected
- `app/admin/components/collection-view-transition.tsx`
- `app/admin/services/services-manager.tsx`
- `app/admin/staff/staff-manager.tsx`
- `app/admin/calendar/calendar-manager.tsx`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- kept the transition logic in one reusable admin component instead of duplicating page-specific animation state
- animated the rendered collection content rather than the toggle button itself so the interaction feels calmer without changing filtering or modal behavior
- used a lightweight opacity and transform transition because it improves perceived smoothness without introducing a heavier animation system

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing

## Iteration 16
Date/time: 2026-04-20 sorting transition polish

### What changed
- extended the shared collection transition wrapper so Services and Staff can animate on sort changes as well as card/list switches
- softened the visible reorder when the sort control changes from default to ascending or descending
- kept blackout dates on the existing view-switch-only transition because that collection does not use the same sort control

### Files/modules affected
- `app/admin/components/collection-view-transition.tsx`
- `app/admin/services/services-manager.tsx`
- `app/admin/staff/staff-manager.tsx`
- `docs/ITERATION_LOG.md`

### Schema / migration changes
- none

### Decisions made
- reused the existing shared transition component instead of introducing a separate sort animation path
- keyed the transition by both view mode and sort value so sort changes animate without affecting search or filter updates

### Open issues / risks
- admin auth is still missing, so the scheduling workspace remains operationally exposed in the same way as the rest of admin
- the calendar still uses the current local runtime timezone assumptions for rendering and editing

### Next recommended step
- implement staff availability management and appointment status editing
