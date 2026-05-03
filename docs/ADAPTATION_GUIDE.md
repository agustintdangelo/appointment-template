# ADAPTATION GUIDE

## Purpose
This template should be easy to adapt from one appointment-based business to another.

## What should usually change
- business name
- logo / branding
- homepage copy
- services
- staff names
- service durations
- prices
- business hours
- default language
- OAuth provider credentials if optional customer sign-in should be available
- seed/demo data

## Where to change it
- update the seeded business and demo records in `prisma/seed.mjs`
- or use the admin pages to adjust branding, services, staff, and schedule rules from the calendar workspace after bootstrapping
- use `/admin/settings` to choose the default language for the public site and admin workspace
- in platform mode, use `/admin/[businessSlug]/settings` for the target business
- update homepage and catalog presentation only if the new vertical needs different marketing copy
- keep the Prisma entities generic unless a real cross-vertical requirement forces a schema change

## What should usually remain generic
- Service entity
- StaffMember entity
- Appointment entity
- Customer entity
- booking flow
- schedule logic
- blackout handling
- admin CRUD structure

## Examples
### Nail salon -> barbershop
Change:
- services
- copy
- staff
- branding

Keep:
- same core booking model

### Nail salon -> consultant
Change:
- service names to session types
- beauty-specific copy
- branding

Keep:
- appointments, time slots, schedules, admin management

## Current adaptation note
- the current demo uses beauty-oriented service names
- the core booking logic does not assume beauty-specific behavior
- day-to-day demo adjustments can now happen through admin pages instead of seed edits alone
- branding can be changed from `/admin/[businessSlug]/branding` without code edits
- the default language can be changed from `/admin/[businessSlug]/settings`; Spanish (`es`) is the safe fallback if no locale is configured
- calendar-based scheduling adjustments, blackout rules, and Business periods can be managed from `/admin/[businessSlug]/calendar`
- logos and favicon are stored in the database and served through the app
- public customers can always book as guests with full name, email, and phone
- optional Google / Apple sign-in can be enabled per deployment through OAuth environment variables
- customer OAuth is configured once for the platform domain, not once per client business path
- authenticated bookings link to a reusable `Customer` record, while guest contact details stay on the appointment
- public links should include the business slug, for example `/studio-hours-demo/book`
- admin links should include the business slug, for example `/admin/studio-hours-demo/calendar`
- legacy single-business URLs redirect to the first seeded business for local development continuity
- appointment rows now include contact fields and a hashed management-token foundation for future secure cancellation/modification links
- actual cancellation/modification pages and confirmation delivery providers are still future work
- Apple Sign-In setup should wait for one HTTPS platform domain and use `/api/auth/callback/apple` as the shared callback
- if a new vertical needs different durations, buffers, schedules, branding, or demo copy, prefer seed/config updates over branching business logic

## Adding another language
- add the locale code, natural label, and date-fns locale mapping in `lib/i18n.ts`
- add the translated dictionary in `lib/i18n.ts`
- keep all Spanish keys populated because missing translations fall back to Spanish
- once supported, the locale will appear in selectors through the centralized locale options

## Localized UI transition conventions
- wrap new server-rendered major sections with `app/components/localized-section.tsx`
- in client components, add `data-locale-section=""` plus `data-locale-section-order="0"` through `"5"` to major panels that should crossfade during language refresh
- keep stagger orders subtle: header or intro first, main content next, secondary panels last
- use `localized-action` or sensible min-width/min-height utilities for translated buttons, nav items, cards, badges, and selector controls that would otherwise resize aggressively
- do not add fixed heights only to hide translation changes; prefer stable line-height, minimum sizes, responsive grids, and text wrapping
- reduced-motion behavior is handled globally, so new sections should not add separate language-switch animations
