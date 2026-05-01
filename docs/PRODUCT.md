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
- optional Google / Apple customer sign-in
- guest contact collection
- booking confirmation

### Admin side
- calendar workspace with day / week / month views
- appointment list
- branding customization
- service CRUD
- staff CRUD
- business hours management inside the calendar workspace, including multiple Business periods per day, preserved closed-day periods, and copy-to-days editing
- blackout date management inside the calendar workspace
- seeded admin user record for future auth work

## Current implementation status
- implemented: landing page
- implemented: public services page
- implemented: booking flow with staff selection
- implemented: optional Google / Apple sign-in for public customer bookings
- implemented: guest booking path with required full name, email, and phone
- implemented: live availability generation
- implemented: appointment creation with server-side revalidation
- implemented: appointment/customer data foundation for future secure management links
- implemented: internal placeholder for future confirmation delivery providers
- implemented: admin calendar workspace with day / week / month views
- implemented: appointments and blackout dates rendered together in the admin calendar
- implemented: admin appointment list
- implemented: admin-managed branding settings for public pages
- implemented: admin-managed default language for Spanish and English
- implemented: public language selector with a per-browser override
- implemented: service CRUD with card/list browsing and modal create/edit
- implemented: staff CRUD with card/list browsing and modal create/edit
- implemented: integrated multi-period business-hours editing inside the calendar workspace with strict inline validation and copy-to-days support
- implemented: integrated blackout browsing plus modal create/edit/delete inside the calendar workspace
- not implemented yet: admin login
- not implemented yet: appointment status update UI
- not implemented yet: customer cancellation, modification, rescheduling, or "My appointments" pages
- not implemented yet: actual email, SMS, WhatsApp, or other confirmation delivery

## Core booking assumptions
- a service has a duration
- a service may have an optional buffer
- a booking belongs to one service
- a booking may belong to one staff member
- availability is computed from schedules, blackout dates, and existing appointments
- this first slice requires choosing a specific staff member before slot generation
- customers can book without signing in by providing full name, email, and phone
- customers who sign in with Google or Apple still review and can edit contact details before confirming
- authenticated bookings are linked to a customer identity derived from the server-side session
- guest bookings keep guest contact details directly on the appointment
- bookings are confirmed immediately after creation in the current implementation

## Localization behavior
- supported languages are Spanish (`es`) and English (`en`)
- Spanish is the product default when no language is configured
- admins configure the business default language from `/admin/settings`
- the configured default language applies to the public booking experience and the admin workspace
- public visitors can switch language from the public selector; that choice is stored for their browser and does not change the admin-configured default
- unsupported or missing locale values fall back to Spanish

## Out of scope for MVP
- payments
- reminders
- marketplace features
- customer cancellation / modification / rescheduling flows
- customer appointment history pages
- full confirmation-message provider integrations
- multi-location
- subscriptions
- advanced analytics
- external calendar sync

## Future roadmap
- appointment status editing
- staff-specific availability management
- customer appointment management links
- reminder / confirmation delivery system
- rescheduling
- deposits / payments
- multi-business support
