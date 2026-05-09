# Impeccable Memory

## Current critique decisions

- Use Impeccable as the design guidance layer for UI critique, polish, layout, hardening, and visual-system decisions.
- Keep the public demo/template copy in place for now. This branch is setting up and evaluating a reusable demo, so language such as MVP, template, slice, and demo notes is intentional until the product is prepared for a non-demo customer deployment.
- Do act on the rest of the critique findings:
  - make the booking form easier to scan by grouping decisions into clearer stages
  - keep booking state explicit with selected-slot pressed state, polite loading/empty announcements, alert errors, retry for availability failures, customer-field autocomplete, and disabled confirmation until required fields plus a slot are complete
  - show active state in admin navigation
  - keep admin modal workflows keyboard-safe with focus trap, focus restoration, Escape close, and scroll lock
  - preserve calendar readability on narrow screens by allowing day/week grid scrolling instead of over-compressing columns
  - clarify icon-heavy collection controls with text
  - add stronger reassurance around destructive admin actions, including disabled delete buttons until acknowledgement is checked
- Preserve `/admin/branding` as the source of customer-facing personalization for colors, fonts, logos, and favicon.
- Keep admin controls operationally neutral; use branded treatment only in public pages and branding previews.
