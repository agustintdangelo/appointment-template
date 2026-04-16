# PRODUCT

## Summary
This project is a reusable appointment-booking template for service businesses.

The first demo implementation represents a nail salon, but the architecture should remain generic enough to support other appointment-based businesses.

## Core users
1. Customers who want to book a service
2. Business admins who manage services, staff, availability, and appointments

## MVP scope
### Public side
- landing page
- services list
- booking flow
- availability picker
- booking confirmation

### Admin side
- calendar workspace with day / week / month views
- appointment list
- branding customization
- service CRUD
- staff CRUD
- business hours management inside the calendar workspace
- blackout date management inside the calendar workspace
- seeded admin user record for future auth work

## Current implementation status
- implemented: landing page
- implemented: public services page
- implemented: booking flow with staff selection
- implemented: live availability generation
- implemented: appointment creation with server-side revalidation
- implemented: admin calendar workspace with day / week / month views
- implemented: appointments and blackout dates rendered together in the admin calendar
- implemented: admin appointment list
- implemented: admin-managed branding settings for public pages
- implemented: service CRUD with card/list browsing and modal create/edit
- implemented: staff CRUD with card/list browsing and modal create/edit
- implemented: integrated business-hours editing inside the calendar workspace
- implemented: integrated blackout browsing plus modal create/edit/delete inside the calendar workspace
- not implemented yet: admin login
- not implemented yet: appointment status update UI

## Core booking assumptions
- a service has a duration
- a service may have an optional buffer
- a booking belongs to one service
- a booking may belong to one staff member
- availability is computed from schedules, blackout dates, and existing appointments
- this first slice requires choosing a specific staff member before slot generation
- bookings are confirmed immediately after creation in the current implementation

## Out of scope for MVP
- payments
- reminders
- marketplace features
- multi-location
- subscriptions
- advanced analytics
- external calendar sync

## Future roadmap
- appointment status editing
- staff-specific availability management
- customer accounts
- reminder system
- rescheduling
- deposits / payments
- multi-business support
