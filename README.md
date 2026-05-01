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
- NextAuth for optional public OAuth sign-in

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
- Optional Google / Apple sign-in for public customers
- Guest booking with required full name, email, and phone
- Appointment creation
- Admin appointment list
- Admin branding customization
- Admin services CRUD
- Admin staff CRUD
- Admin localization setting for Spanish / English
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
- `/admin/settings`
- `/api/availability`
- `/api/appointments`
- `/api/auth/[...nextauth]`
- `/api/brand-assets/[assetId]`

## Localization

The app supports Spanish (`es`) and English (`en`). Spanish is the default whenever a business has no saved locale or an invalid locale is encountered.

- The global default language is stored on `Business.defaultLocale`.
- Admins can change the default language from `/admin/settings`.
- The configured default is used by the public pages and the admin workspace.
- Public visitors can switch languages from the visible language selector. Their choice is saved in `localStorage` and the `appointment_public_locale` cookie for that browser, and it overrides the business default only for that visitor.
- Missing translation keys fall back to Spanish through `lib/i18n.ts`.

To add another language later:

1. Add the locale code to `supportedLocales` in `lib/i18n.ts`.
2. Add its natural display name to `localeLabels`.
3. Add a date-fns locale entry to `dateFnsLocales`.
4. Add a translation dictionary beside `es` and `en`.
5. Update admin validation/options if the language should be selectable immediately.

## Optional customer sign-in

Public customers can book as guests or sign in with Google / Apple during the booking flow. Sign-in is optional and only affects customer convenience; it is separate from the admin workspace.

- Guest bookings require full name, email, and phone.
- Authenticated bookings are associated with a `Customer` record derived from the server-side NextAuth session.
- The booking form keeps selected service, staff, date, time, and entered contact details in session storage while the visitor completes OAuth.
- Google and Apple profile details prefill name/email when available, but customers can edit contact fields before confirming.
- The appointment stores contact email/phone for future confirmation delivery and a hashed management token foundation for future secure cancellation/modification links.
- Cancellation, modification, rescheduling, and customer "My appointments" pages are intentionally not implemented in this slice.

Required environment variables when enabling OAuth:

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
GOOGLE_CLIENT_ID="replace-with-google-client-id"
GOOGLE_CLIENT_SECRET="replace-with-google-client-secret"
APPLE_CLIENT_ID="replace-with-apple-service-id"
APPLE_CLIENT_SECRET="replace-with-apple-client-secret-jwt"
```

OAuth callback URLs:

- Google: `http://localhost:3000/api/auth/callback/google`
- Apple: `http://localhost:3000/api/auth/callback/apple`

For production, replace the host with the deployed domain. Apple Sign-In also requires an Apple Developer Service ID, an enabled web return URL, and a client-secret JWT generated from the Apple team/key configuration.

## Confirmation delivery foundation

`lib/confirmation.ts` contains the internal placeholder for future email, SMS, WhatsApp, or other confirmation delivery. This task does not send messages yet. Future delivery should include appointment details, business contact details, and a secure management link generated from the raw token at booking time while storing only the hash.

## Branding customization

Branding is now business-owned data, not hardcoded theme values.

- Admins can update the public site's primary and secondary fonts from a curated font catalog.
- Admins can set primary, secondary, background, and text colors. The app derives surface, border, muted, and button tokens from those values.
- Admins can upload a main logo, an alternate logo for dark surfaces, and a favicon.
- Uploaded branding assets are stored in the database and served through `/api/brand-assets/[assetId]`.
- The branding editor keeps the admin UI neutral and uses the branded preview only for the customer-facing surfaces.
- Saving happens in place through a multipart POST to `/api/admin/branding`, so the page does not redirect or jump to the top.
- No new environment variables are required for branding in this version.

### Upload rules

- `LOGO` and `LOGO_ALT`: `image/png`, `image/jpeg`, `image/webp`, max `2 MB`
- `FAVICON`: `image/png`, `image/x-icon`, `image/vnd.microsoft.icon`, max `512 KB`
- SVG uploads are intentionally rejected in v1 because there is no sanitization pipeline yet

### Runtime behavior

- Public pages read branding settings through a tagged public-branding query that is revalidated after each branding save.
- Missing or partial branding falls back to the default theme values seeded in the schema.
- The admin area stays operationally neutral, except for the dedicated branding preview on `/admin/branding`.
- Low-contrast palette combinations trigger warnings in the editor, but they do not block saving.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```
