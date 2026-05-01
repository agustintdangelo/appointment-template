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
- branding can be changed from `/admin/branding` without code edits
- the default language can be changed from `/admin/settings`; Spanish (`es`) is the safe fallback if no locale is configured
- calendar-based scheduling adjustments, blackout rules, and Business periods can be managed from `/admin/calendar`
- logos and favicon are stored in the database and served through the app
- public customers can always book as guests with full name, email, and phone
- optional Google / Apple sign-in can be enabled per deployment through OAuth environment variables
- authenticated bookings link to a reusable `Customer` record, while guest contact details stay on the appointment
- appointment rows now include contact fields and a hashed management-token foundation for future secure cancellation/modification links
- actual cancellation/modification pages and confirmation delivery providers are still future work
- if a new vertical needs different durations, buffers, schedules, branding, or demo copy, prefer seed/config updates over branching business logic

## Adding another language
- add the locale code, natural label, and date-fns locale mapping in `lib/i18n.ts`
- add the translated dictionary in `lib/i18n.ts`
- keep all Spanish keys populated because missing translations fall back to Spanish
- once supported, the locale will appear in selectors through the centralized locale options
