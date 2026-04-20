# Appointment Template

Reusable appointment-booking starter for service businesses.

The first seeded demo is a nail studio, but the core domain is generic enough for other businesses that sell time slots.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma 7
- SQLite
- Zod
- date-fns

## Local setup

```bash
npm install
cp .env.example .env
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Current MVP slice

- Landing page
- Public services page
- Booking flow with live availability
- Appointment creation
- Admin appointment list
- Admin branding customization
- Admin services CRUD
- Admin staff CRUD
- Admin calendar workspace with integrated blackout management and multi-period business-hours management

## Useful routes

- `/`
- `/services`
- `/book`
- `/admin/appointments`
- `/admin/calendar`
- `/admin/branding`
- `/admin/services`
- `/admin/staff`
- `/api/availability`
- `/api/appointments`
- `/api/brand-assets/[assetId]`

## Branding customization

Branding is now business-owned data, not hardcoded theme values.

- Admins can update the public site's primary and secondary fonts from a curated font catalog.
- Admins can set primary, secondary, background, and text colors. The app derives surface, border, muted, and button tokens from those values.
- Admins can upload a main logo, an alternate logo for dark surfaces, and a favicon.
- Uploaded branding assets are stored in the database and served through `/api/brand-assets/[assetId]`.
- The branding editor keeps the admin UI neutral and uses the branded preview only for the customer-facing surfaces.
- Saving happens in place through a server action state flow, so the page does not redirect or jump to the top.
- No new environment variables are required for branding in this version.

### Upload rules

- `LOGO` and `LOGO_ALT`: `image/png`, `image/jpeg`, `image/webp`, max `2 MB`
- `FAVICON`: `image/png`, `image/x-icon`, `image/vnd.microsoft.icon`, max `512 KB`
- SVG uploads are intentionally rejected in v1 because there is no sanitization pipeline yet

### Runtime behavior

- Public pages read branding settings at request time through the public layout.
- Missing or partial branding falls back to the default theme values seeded in the schema.
- The admin area stays operationally neutral, except for the dedicated branding preview on `/admin/branding`.
- Low-contrast palette combinations trigger warnings in the editor, but they do not block saving.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```
