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
- Admin services CRUD
- Admin staff CRUD
- Admin business-hours management
- Admin blackout-date CRUD

## Useful routes

- `/`
- `/services`
- `/book`
- `/admin/appointments`
- `/admin/services`
- `/admin/staff`
- `/admin/business-hours`
- `/admin/blackout-dates`
- `/api/availability`
- `/api/appointments`

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```
