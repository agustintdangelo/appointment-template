# AI Booking Assistant — Design Doc

> Status: **Draft / proposed** · Owner: Agustín · Related epic: KAN (Phase 2: AI booking assistant)
> Depends on: **KAN-23** (ship-blocker correctness epic) and **KAN-14** (status actions, for cancel/reschedule).

## 1. Goal

Let an entrepreneur's customers book, reschedule, and cancel appointments through a
natural-language assistant (web chat first, then WhatsApp), and let the owner run
day-to-day admin by chat. The assistant is a **conversational front-end over the
existing booking engine** — it adds no new source of truth.

## 2. Core principle: the LLM orchestrates, never writes

The model holds the conversation and decides *which* validated function to call. All
availability math, double-booking guards, tenant isolation, and persistence stay in
application code. The model never touches the database and never sees raw SQL.

```
  Customer (WhatsApp / Web)
        | natural language
        v
  Channel adapter        (Twilio / WhatsApp Cloud API / web socket)
        |
        v
  Agent runtime          Claude + tool-use loop
   - system prompt        - conversation state
   - tenant context       - tool dispatcher
        | function calls only
        v
  Tool layer (NEW)       thin, typed wrappers — NO business logic
        |
        v
  EXISTING service layer lib/booking.ts, lib/queries.ts, Prisma
```

## 3. Tool layer (mapped to existing code)

Functions are keyed by opaque IDs (`serviceId`, `staffMemberId`, `businessId`), but a
customer says "corte con Sofía". So the toolset splits into **resolution** and
**action** tools.

| Tool | Wraps | Purpose |
|---|---|---|
| `list_services` | `lib/queries.ts` getBusinessBySlug | name -> serviceId, duration, price |
| `list_staff` | staff query | name -> staffMemberId; "cualquiera" -> omit |
| `check_availability` | `getBookingAvailability(input, locale)` | slots incl. `assignedStaffMemberId` |
| `create_booking` | consolidated `bookAppointment()` (see §7) | commits, returns confirmation code |
| `lookup_appointment` | new — confirmation code + phone | for cancel/reschedule |
| `cancel_appointment` | KAN-14 status actions | frees the slot |

**Critical contract:** `check_availability` returns slots keyed by
`startAt.toISOString()`, and `create_booking` requires that exact `slotStart` string
(`bookingSchema`, `validation.ts`: `.datetime({ offset: true })`). The tool layer must
pass the ISO slot through verbatim; the model treats it as an opaque token and never
reconstructs a timestamp. This single rule prevents a class of timezone hallucination.

## 4. Tenant & identity context

- **Which business?** Every conversation is bound to a `businessSlug` before the model
  starts. Web embed knows its slug. WhatsApp maps **the tenant's WhatsApp number ->
  businessSlug**. The slug is injected server-side into tenant scope on every tool call;
  the model is never allowed to choose the tenant.
- **Who's the customer?** On WhatsApp the phone number is already verified — prefill
  `customerPhone`, skip the question. Name + email are still required by `bookingSchema`.

## 5. Conversation flow (happy path)

```
User: "hola, querría un turno para corte mañana a la tarde"
 -> list_services()                      -> [{corte, id:svc_123, 30min}]
 -> check_availability(svc_123, date=tomorrow, staff=any)
                                         -> [15:00 Sofía, 15:30 Sofía, 16:00 Juan]
Bot: "Tengo 15:00 o 15:30 con Sofía, o 16:00 con Juan. ¿Cuál preferís?"
User: "16 con Juan"
 -> collect name, email (phone known on WhatsApp)
 -> confirm summary, get "sí"
 -> create_booking(slotStart="...T16:00:00-03:00", staff=juan_id, contact…)
Bot: "Listo. Código A1B2C3. Te esperamos mañana 16:00 con Juan."
```

## 6. Guardrails

- **No raw DB access** — model sees only the tools; cannot bypass `bookingSchema`.
- **Server re-validates at commit** — stale slot from an old conversation fails cleanly
  ("slot-unavailable") and the bot re-offers.
- **Tenant isolation** — scope injected server-side, never model-controlled.
- **Confirmation before write** — agent echoes service/time/staff and gets explicit
  consent before `create_booking`.
- **Rate limiting / abuse** — per-number throttling on the channel adapter.

## 7. Prerequisite refactor: one booking path

Today there are two divergent creation paths:
`lib/booking.ts -> createBookingAppointment` (no management token, no slug resolution,
no confirmation email) and the `/api/appointments` POST route (full path with
management token + `prepareAppointmentConfirmation`). The AI tool layer must call **one**
path. Consolidate to a single `bookAppointment()` service function that both the web form
and the AI tool call — otherwise chatbot and web form drift apart. Good hygiene
regardless of AI.

## 8. Correctness dependency (why KAN-23 is first)

`lib/booking.ts` confirms the ship-blockers sit directly under the assistant:
- `combineDateAndTime` uses `setHours()` -> server-local time, no timezone (**KAN-10**).
- No filtering of past `cursor` values -> past slots offered (**KAN-11**).
- check-then-`create` with no transaction/unique constraint -> double-booking race
  (**KAN-12**).

A conversational confirmation is trusted *more* than a form, so shipping the bot on a
buggy engine amplifies the damage. **KAN-23 ships before the assistant.**

## 9. Stack

- **Model:** Claude Sonnet for the booking loop (tool routing, not deep reasoning).
  Anthropic SDK with `tools` + agent loop. **Prompt caching** on the system prompt +
  per-tenant catalog (services/staff change rarely) for a large per-conversation cost win.
- **Channel:** web chat first (no Meta verification friction), then WhatsApp Cloud API.
  Same agent core, swap the adapter.
- **State:** stateless-per-turn; rehydrate from message history + a small structured
  "booking draft" persisted per conversation.

## 10. Phasing

1. **KAN-23** (correctness) — prerequisite.
2. **Consolidate booking into one service fn** (§7).
3. **Tool layer + agent core, web chat** — internal demo against one tenant.
4. **WhatsApp adapter + tenant->number routing.**
5. **Cancel/reschedule** (depends on KAN-14) + **admin copilot.**

## 11. Admin copilot — implementation

The owner runs day-to-day by chat: "¿cuántos turnos tengo mañana?", "cancelá el de las
15h", "bloqueá el viernes a la tarde", "agendá a María a las 17". Same agent core as the
customer assistant (§3, §9), but a **distinct toolset and a hard auth boundary**.

### Shared vs. distinct
- **Shares:** agent runtime, tool-use loop, prompt caching, tenant binding, the
  orchestrator-never-writes principle.
- **Distinct:** requires an authenticated admin session; the toolset includes
  **mutations**, not just reads; confirmation discipline is stricter.

### Auth & tenant context
- Runs **behind admin authentication** (depends on **KAN-15**). The conversation is bound
  to the authenticated admin's `businessSlug` **server-side**; the model cannot switch
  tenants or escalate scope.
- Admin identity/permissions are resolved server-side; every tool executes with that scope.
- Start the surface **inside `/admin`** (desktop + mobile) where the auth session already
  exists — not WhatsApp. An owner WhatsApp line can come later.

### Read tools (wrap existing `lib/queries.ts` admin readers)

| Tool | Wraps | Returns |
|---|---|---|
| `admin_list_appointments` | `getAdminAppointments` | appointments incl. **id**, status, customer, service, staff, time |
| `admin_day_schedule` | `getAdminCalendar` (filtered by date) | appointments + blackouts + staff for a given day |
| `admin_list_services` | `getAdminServices` | services + appointment counts |
| `admin_list_staff` | `getAdminStaffMembers` | staff + counts |
| `admin_business_hours` | `getAdminBusinessHours` | weekly hours |

### Write tools (wrap the **server actions** that already back the admin UI — same validation)

| Tool | Backs | Notes |
|---|---|---|
| `admin_set_appointment_status` | KAN-14 status action | confirm / cancel / complete / no-show; cancel frees the slot |
| `admin_create_blackout` | calendar-manager blackout create | block a date/time, optionally per-staff |
| `admin_delete_blackout` | calendar-manager blackout delete | reopen blocked time |
| `admin_create_booking` | `bookAppointment()` (KAN-25) | walk-in / phone booking (ties to KAN manual booking) |
| `admin_edit_appointment` *(later)* | KAN-20 | move time / staff / notes |

No tool writes to Prisma directly — each goes through the same server action the UI uses,
so existing validation, tenant scoping, and the double-booking guard are preserved.

### The reference-resolution problem (harder than the customer side)
"Cancelá el de las 15h" is a **fuzzy reference** the model must map to a concrete
`appointmentId`. Pattern:
1. Model calls a **read** tool that returns appointments **with their ids**.
2. Model selects the id and **echoes the specific appointment** back:
   *"Turno de Juan Pérez — corte, hoy 15:00 con Sofía. ¿Lo cancelo?"*
3. Only after explicit "sí" does it call the mutation.
4. **If two or more appointments match, it must ask** — never act on an ambiguous match.

### Guardrails (stricter than customer-facing)
- Every mutation requires **explicit confirmation**; destructive ones (cancel, delete
  blackout) require an unambiguous, echoed target.
- All writes go through existing server actions — **no direct DB access** from tools.
- **Audit log** every mutation: `(admin, tool, args, result, timestamp)`.
- **Read/write tool separation** so a read-only copilot mode is possible (e.g. for staff
  vs. owner).
- Session tied to the admin auth cookie; rate-limited.

### Example conversations
```
"¿cuántos turnos tengo mañana?"
  -> admin_day_schedule(date=tomorrow) -> "Tenés 6 turnos: 9:00 …, 10:30 …"

"cancelá el de las 15"
  -> admin_day_schedule(today) -> resolve id -> echo + confirm
  -> admin_set_appointment_status(id, CANCELLED)

"bloqueá el viernes de 14 a 18"
  -> admin_create_blackout(start, end) -> confirm

"agendá a María, corte, hoy 17h con Sofía"
  -> admin_create_booking(...) -> confirm   (walk-in)
```

### Dependencies
**KAN-15** (admin auth) · **KAN-14** (status actions) · **KAN-25** (single booking fn);
benefits from manual-booking and edit-appointment stories. Tracked as **KAN-33**.

## 12. Open questions

- WhatsApp: one shared platform number with keyword routing, or per-tenant numbers?
- Email still mandatory in a chat flow, or relax `bookingSchema` to phone-only for bot bookings?
- Where does conversation history live (DB table vs. ephemeral store)?
- Human handoff: when the bot can't resolve, how does it escalate to the owner?
- Admin copilot: read-only first, or ship reads + mutations together?
- Admin access: owner-only, or per-staff with a restricted (read-only / own-appointments) toolset?
- Where do audit-log entries live, and what retention?
