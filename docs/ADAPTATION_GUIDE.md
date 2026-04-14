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
- seed/demo data

## Where to change it
- update the seeded business and demo records in `prisma/seed.mjs`
- or use the admin pages to adjust branding, services, staff, business hours, and blackout dates after bootstrapping
- update homepage and catalog presentation only if the new vertical needs different marketing copy
- keep the Prisma entities generic unless a real cross-vertical requirement forces a schema change

## What should usually remain generic
- Service entity
- StaffMember entity
- Appointment entity
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
- logos and favicon are stored in the database and served through the app
- if a new vertical needs different durations, buffers, schedules, branding, or demo copy, prefer seed/config updates over branching business logic
