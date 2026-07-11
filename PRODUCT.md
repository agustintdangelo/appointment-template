# Product

## Register

product

## Users

This template serves two primary groups:

1. Customers who want to book a service without calling, waiting for a reply, or guessing availability.
2. Business admins who manage services, staff, business hours, blackout dates, branding, and appointments.

Customers may arrive from a small service business website and need a clear, low-friction booking path. Admins are operators, not technical users; they need practical controls that stay understandable during repeated day-to-day use.

## Product Purpose

This project is a reusable appointment-booking template for service businesses that sell time slots. The first seeded demo represents a nail salon, but the system must remain generic enough for beauty centers, barbershops, spas, tattoo studios, consultants, and similar appointment-based businesses.

Success means the public booking flow feels straightforward, the admin workspace makes scheduling and business setup manageable, and the codebase stays easy to rebrand and adapt without hardcoding one vertical into the core logic. The branding workspace at `/admin/branding` is central to that promise: it lets each business personalize the customer-facing appointment experience with its own colors, fonts, logos, and favicon while keeping the shared booking product intact.

## Brand Personality

Simple, useful, intuitive.

The product should feel calm and capable, with enough polish to inspire trust but no decorative complexity that gets in the way of booking or operating the business. The public side should reflect the configured business brand so customers experience the appointment app as belonging to that business. The admin side should remain neutral, legible, and work-focused.

## Anti-references

Avoid:

- beauty-only assumptions in domain models, core booking logic, or admin workflows
- fake availability, placeholder scheduling logic, or UI that implies slots exist before constraints are checked
- generic SaaS decoration: oversized metric heroes, purple gradients, repeated icon-card grids, glassy panels, and card-heavy marketing filler
- admin UI that feels like a branded landing page instead of an operational workspace
- hidden validation, redirect-driven save feedback, or abrupt layout jumps in modal workflows
- visual choices that depend on brand colors while assuming dark text will remain readable

## Design Principles

1. Make the real workflow visible: customers should understand what they are choosing, and admins should see the operational state they are changing.
2. Keep the template adaptable: demo content can be vertical-specific, but entities, booking rules, and admin patterns should remain reusable.
3. Prefer practical clarity over spectacle: especially in admin surfaces, use restrained UI that helps scanning, comparison, and repeated action.
4. Centralize brand behavior: public theming should flow from `/admin/branding` through persisted settings, shared tokens, and branding helpers rather than scattered one-off styles.
5. Validate where it matters: availability, branding assets, colors, fonts, business hours, and form submissions should be checked server-side or through shared domain helpers.

## Accessibility & Inclusion

Aim for WCAG AA contrast for core text and controls. Respect reduced-motion preferences when adding transitions or animation. Do not rely on color alone to communicate validation, status, or appointment state. Public brand customization may allow admin override, but contrast risks should surface as clear warnings.

## MVP Scope

### Public side

- single customer-first appointment page at `/`
- Spanish customer-facing copy for the public booking and confirmation flow
- single-business intro entry step before the appointment form (multi-location remains out of scope)
- compatibility redirects from `/book` and `/services`
- availability picker
- booking confirmation
- runtime branding driven by persisted business settings managed from `/admin/branding`

### Admin side

- calendar workspace with day / week / month views
- appointment list
- branding customization for the customer-facing appointment experience
- service CRUD
- staff CRUD
- business hours management inside the calendar workspace, including multiple Business periods per day, preserved closed-day periods, and copy-to-days editing
- blackout date management inside the calendar workspace
- seeded admin user record for future auth work

## Current Implementation Status

- implemented: single customer-first public booking page at `/`
- implemented: Spanish public booking and confirmation copy
- implemented: single-business intro entry step before the appointment form
- implemented: compatibility redirects from `/book` and `/services`
- implemented: booking flow with card-based service selection and optional staff preference
- implemented: live availability generation
- implemented: appointment creation with server-side revalidation through shared booking orchestration
- implemented: admin calendar workspace with day / week / month views
- implemented: appointments and blackout dates rendered together in the admin calendar
- implemented: admin appointment list
- implemented: admin-managed branding settings for public pages through `/admin/branding`
- implemented: service CRUD with card/list browsing and modal create/edit
- implemented: staff CRUD with card/list browsing and modal create/edit
- implemented: integrated multi-period business-hours editing inside the calendar workspace with strict inline validation and copy-to-days support
- implemented: integrated blackout browsing plus modal create/edit/delete inside the calendar workspace
- not implemented yet: admin login
- not implemented yet: appointment status update UI

## Core Booking Assumptions

- a service has a duration
- a service may have an optional buffer
- a booking belongs to one service
- a booking may belong to one staff member
- availability is computed from schedules, blackout dates, and existing appointments
- customers can choose "Cualquier profesional" or a specific staff preference before slot generation
- "Cualquier profesional" deterministically assigns the first available staff member by staff ordering for the chosen slot
- the intro entry step confirms the primary business record as the single booking context; multi-location remains out of scope
- bookings are confirmed immediately after creation in the current implementation

## Out Of Scope For MVP

- payments
- reminders
- marketplace features
- multi-location
- subscriptions
- advanced analytics
- external calendar sync

## Future Roadmap

- appointment status editing
- staff-specific availability management
- customer accounts
- reminder system
- chatbot-assisted booking that reuses the shared server booking orchestration
- rescheduling
- deposits / payments
- multi-business support
