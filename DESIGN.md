---
name: Appointment Template
description: A calm, adaptable booking product for service businesses.
colors:
  public-background: "#f4ece3"
  public-foreground: "#221d18"
  public-muted: "#6d6256"
  public-surface: "#fffaf4"
  public-card: "#fffdf8"
  public-border: "#ddcfbd"
  public-accent: "#1b625a"
  public-accent-strong: "#124740"
  public-accent-foreground: "#eff8f6"
  public-highlight: "#f2c7bb"
  admin-background: "#f5f4f1"
  admin-foreground: "#1f2937"
  admin-muted: "#64748b"
  admin-surface: "#f8fafc"
  admin-card: "#ffffff"
  admin-border: "#d6dde5"
  admin-accent: "#0f172a"
  admin-accent-strong: "#1e293b"
  admin-warning-surface: "#fffbeb"
  admin-warning-text: "#92400e"
  admin-error-surface: "#fef2f2"
  admin-error-text: "#991b1b"
  admin-success-surface: "#f0fdf4"
  admin-success-text: "#166534"
typography:
  display:
    fontFamily: "Playfair Display, Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, Avenir Next, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, Avenir Next, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, Avenir Next, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, Avenir Next, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.24em"
rounded:
  checkbox: "4px"
  control: "14px"
  panel: "16px"
  modal: "20px"
  public-card: "28px"
  public-panel: "32px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "40px"
components:
  public-button-primary:
    backgroundColor: "{colors.public-accent}"
    textColor: "{colors.public-accent-foreground}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  public-button-secondary:
    backgroundColor: "{colors.public-surface}"
    textColor: "{colors.public-foreground}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  admin-button-primary:
    backgroundColor: "{colors.admin-accent}"
    textColor: "{colors.admin-surface}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  admin-button-secondary:
    backgroundColor: "{colors.admin-card}"
    textColor: "#334155"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  admin-input:
    backgroundColor: "{colors.admin-card}"
    textColor: "{colors.admin-accent}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  admin-panel:
    backgroundColor: "{colors.admin-card}"
    textColor: "{colors.admin-foreground}"
    rounded: "{rounded.panel}"
---

# Design System: Appointment Template

## 1. Overview

**Creative North Star: "The Clear Appointment Desk"**

This system should feel like a well-run front desk translated into software: direct, composed, and ready for repeated use. The public side carries the configured business brand through runtime tokens so customers experience the appointment app as belonging to the business they are booking with. The admin side stays deliberately neutral so operators can scan schedules, edit services, and manage branding without visual noise.

The product personality is simple, useful, and intuitive. Design choices should keep real workflows visible: customers understand what they are booking, admins understand what they are changing, and the interface never suggests fake availability or hides validation behind decoration.

This system explicitly rejects beauty-only assumptions, generic SaaS spectacle, card-heavy filler, and admin screens that feel like marketing pages.

**Key Characteristics:**
- restrained product UI with a warmer branded public surface
- customer-facing personalization through `/admin/branding` and semantic CSS variables
- neutral admin shell with consistent forms, panels, lists, and modals
- readable contrast, calm validation feedback, and reduced-motion support
- practical density for scheduling and collection management

## 2. Colors

The palette is split between a warm public brand default and a cooler neutral admin workspace. Public colors are editable business settings managed from `/admin/branding`; admin colors are stable operational defaults.

### Primary
- **Booked Teal** (#1b625a): Public primary accent for booking CTAs, selected slots, accent borders, and filled brand surfaces.
- **Slate Operator** (#0f172a): Admin primary action color for save buttons, selected statuses, checkboxes, and strong operational emphasis.

### Secondary
- **Soft Appointment Rose** (#f2c7bb): Public supporting highlight used for warm notices and low-pressure emphasis.
- **Amber Caution** (#fffbeb): Admin warning surface paired with #92400e for validation that needs attention without alarm.

### Neutral
- **Warm Lobby Background** (#f4ece3): Public page background, derived into surface, card, and border tokens.
- **Ink Brown** (#221d18): Public text color and the source for muted public copy.
- **Cream Surface** (#fffaf4): Public header, footer, and secondary panels.
- **Paper Card** (#fffdf8): Public cards and booking form panels.
- **Quiet Admin Canvas** (#f5f4f1): Admin workspace background.
- **Admin Paper** (#ffffff): Admin panels, cards, modals, and inputs.
- **Slate Copy** (#1f2937): Admin body text.
- **Admin Muted Slate** (#64748b): Helper text, labels, icons, and inactive controls.
- **Admin Border** (#d6dde5): Panel, list, and shell borders.

### Named Rules

**The Runtime Brand Rule.** Public colors, fonts, logos, and favicon must flow from `/admin/branding` through `lib/branding.ts`, `app/(public)/layout.tsx`, asset routes, and CSS variables. Do not hardcode a business-specific hex, font, or asset into a public component.

**The Neutral Admin Rule.** Admin pages use the stable neutral admin palette unless a task explicitly calls for branded admin UI. Branding appears in previews, not in the controls themselves.

## 3. Typography

**Display Font:** Playfair Display with Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif fallback on public branded surfaces.
**Body Font:** Inter with Avenir Next, Segoe UI, Helvetica Neue, sans-serif fallback.
**Label/Mono Font:** Inter for labels; monospace appears only where raw color values are edited.

**Character:** The public side pairs an elegant display serif with a practical sans to make booking feel polished without becoming ornate. The admin side uses the sans stack for every role, including `.font-display`, so the workspace stays plain and task-focused.

### Hierarchy
- **Display** (400, `text-5xl` to `text-6xl`, line-height 0.95): public hero headlines, service names, confirmation headings, and branding previews.
- **Headline** (600, `text-3xl`, line-height about 1.2): admin page titles and major workspace sections.
- **Title** (600, `text-xl` to `text-2xl`, line-height about 1.35): modal titles, card titles, and panel headings.
- **Body** (400, `text-sm` to `text-lg`, line-height 1.6 to 1.75): descriptions, form help, appointment metadata, and long helper copy. Keep prose near 65 to 75 characters when it is not table-like data.
- **Label** (600, `text-xs` to `text-sm`, uppercase where appropriate, letter-spacing 0.24em to 0.3em): admin eyebrows, public section markers, status labels, and compact metadata.

### Named Rules

**The Admin Sans Rule.** Do not use public display typography for admin labels, controls, tables, or dense scheduling UI.

**The Useful Copy Rule.** Headings and supporting copy should not repeat each other. Use helper text to clarify consequences, validation, or next action.

## 4. Elevation

Depth is a hybrid of tonal layering, borders, and very soft shadows. Public cards can feel gently lifted, especially around the booking flow. Admin panels should feel structured rather than floating; borders and neutral surfaces carry most hierarchy.

### Shadow Vocabulary
- **Admin Panel Shadow** (`0 10px 28px -24px rgba(15, 23, 42, 0.22)`): default shadow for admin panels and page intros.
- **Admin List Shadow** (`0 10px 28px -24px rgba(15, 23, 42, 0.18)`): lighter shadow for collection cards and list shells.
- **Brand Panel Shadow** (`0 30px 80px -50px color-mix(in srgb, var(--foreground) 38%, transparent)`): public hero and primary booking containers.
- **Brand Card Shadow** (`0 24px 70px -55px color-mix(in srgb, var(--foreground) 36%, transparent)`): public service cards.
- **Brand Accent Shadow** (`0 20px 60px -45px color-mix(in srgb, var(--accent) 52%, transparent)`): public accent-led cards that need gentle emphasis.

### Named Rules

**The Border First Rule.** Use a 1px border and tonal surface before adding a stronger shadow. Shadows should support hierarchy, not become decoration.

## 5. Components

### Buttons
- **Shape:** Pills for standard text buttons (`9999px`). Icon-only admin controls use a fixed 44px square or 56px square with rounded corners depending on context.
- **Public Primary:** `brand-accent-fill`, `var(--accent)` background, `var(--accent-foreground)` text, usually `12px 24px`.
- **Public Secondary:** transparent or `var(--surface)` background, `1px` border using `var(--border)`, pill shape, hover to `var(--surface)`.
- **Admin Primary:** #0f172a background, #f8fafc text, 44px minimum height, 10px 20px padding.
- **Admin Secondary:** #ffffff background, #cbd5e1 border, #334155 text, hover border #94a3b8 and text #0f172a.
- **Admin Collection Controls:** Sort and view controls should pair icons with visible text labels. Keep ARIA labels, but do not rely on icons alone for everyday browsing actions.
- **Hover / Focus:** transitions run around 180ms. Public accent hover darkens to `var(--accent-strong)`. Focus should use visible border or ring treatment, never color alone.

### Chips
- **Style:** Status badges use pill radius, 1px borders, 12px horizontal padding, 12px text, 600 weight, and 0.04em letter spacing.
- **State:** Confirmed is filled slate; pending uses amber surface; completed returns to the quiet neutral surface.

### Cards / Containers
- **Corner Style:** Admin panels use 16px radius. Admin modals use 20px. Public cards range from 24px to 32px for a softer branded feel.
- **Background:** Public cards use `var(--card)` or `var(--surface)`. Admin cards use #ffffff or #f8fafc.
- **Shadow Strategy:** Use the Elevation vocabulary. Public cards may use brand shadows; admin cards stay low and border-led.
- **Border:** Default is 1px solid semantic border. Dashed borders are reserved for empty, upload, or placeholder states.
- **Internal Padding:** Admin panels usually use 24px. Public primary panels use 32px to 40px.

### Inputs / Fields
- **Style:** Admin fields use #ffffff background, #cbd5e1 border, 14px radius, 44px minimum height, and 12px 16px padding.
- **Public Fields:** Booking controls use `var(--surface)`, `var(--border)`, 16px radius, and focus border `var(--accent)`.
- **Focus:** Admin focus uses #64748b border and `0 0 0 3px rgba(148, 163, 184, 0.18)`.
- **Error / Disabled:** Errors use rose text and calm error banners. Disabled buttons keep shape and reduce opacity to 0.65 or 0.7.

### Navigation
- **Public:** Header and footer use public surface tokens with subtle borders. Links are muted by default and move to foreground on hover.
- **Admin:** Navigation uses the shared button vocabulary, including the "Back to home" action. Mark the current admin section with `aria-current="page"` and the primary button treatment so operators always know where they are.
- **Mobile:** Layouts collapse through Tailwind breakpoints, with grids becoming single-column and controls retaining stable touch sizes.

### Calendar Workspace

The calendar is the primary admin workspace. It should stay dense but readable, with day, week, and month modes sharing the same neutral palette and control vocabulary. Appointment and blackout items need clear labels, stable dimensions, pressed selected state, and status/state differentiation that does not depend only on color. Day and week grids may scroll horizontally on narrow screens instead of compressing event columns until they become unreadable.

### Branding Preview

The branding page at `/admin/branding` is the one admin surface where public brand styling is intentionally visible. Its purpose is customer experience personalization: operators choose fonts, colors, logos, and favicon so the public appointment flow feels custom to their business. Keep the editor controls neutral, then show logo, type, color, and accent behavior inside a contained public preview.

## 6. Do's and Don'ts

### Do:
- **Do** preserve the current public MVP/template/demo wording while this project is explicitly being evaluated as a reusable demo.
- **Do** group booking decisions into scannable stages: service and staff, date and slot, customer details.
- **Do** make booking state explicit: selected slots use pressed state, loading and empty slot states announce politely, and booking/availability errors announce as alerts.
- **Do** give booking availability failures an immediate retry action.
- **Do** keep the booking summary visible on larger screens so customers can check service, staff, date, and slot before confirming.
- **Do** treat `/admin/branding` as the source for customer-facing personalization: fonts, colors, logos, favicon, and derived public theme tokens.
- **Do** keep public theming semantic: `--background`, `--surface`, `--card`, `--border`, `--accent`, `--highlight`, and derived helpers.
- **Do** use the shared admin primitives before inventing a new shell: `AdminPageIntro`, `AdminNotice`, `AdminEmptyState`, `admin-panel`, `admin-card`, `admin-list-shell`, `admin-input`, and shared buttons.
- **Do** keep admin typography sans-only and work-focused.
- **Do** trap focus, restore focus, and support Escape-close behavior in admin modals.
- **Do** require explicit acknowledgement before destructive admin actions that permanently delete services, staff, or blackout dates, and keep the destructive button disabled until acknowledgement is checked.
- **Do** preserve 44px minimum control height for admin inputs and buttons.
- **Do** surface contrast and validation issues as readable warnings close to the action.
- **Do** respect `prefers-reduced-motion` for admin transitions and feedback slots.
- **Do** use filled accent surfaces only with `brand-accent-fill`, `brand-on-accent`, or the derived foreground helpers.

### Don't:
- **Don't** add beauty-only assumptions to domain models, core booking logic, or admin workflows.
- **Don't** show fake availability, placeholder scheduling logic, or UI that implies slots exist before constraints are checked.
- **Don't** use generic SaaS decoration: oversized metric heroes, purple gradients, repeated icon-card grids, glassy panels, or card-heavy marketing filler.
- **Don't** make admin UI feel like a branded landing page instead of an operational workspace.
- **Don't** hide validation, rely on redirect-driven save feedback, or create abrupt layout jumps in modal workflows.
- **Don't** assume dark text will remain readable on admin-selected brand colors.
- **Don't** use side-stripe borders, gradient text, decorative glassmorphism, or nested cards.
- **Don't** animate layout properties for decorative effect. Motion should communicate state and remain brief.
