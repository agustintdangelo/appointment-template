---
name: booking-feature-slice
description: Use when implementing one appointment-app feature end-to-end as a cohesive vertical slice, including affected layers and documentation updates.
---

# Booking Feature Slice

Use this skill when implementing one feature end-to-end in the appointment app.

Read first:
- AGENTS.md
- docs/PRODUCT.md
- docs/ARCHITECTURE.md
- docs/ITERATION_LOG.md

Workflow:
1. Understand the feature
2. Identify affected layers:
   - schema
   - domain logic
   - validation
   - UI
   - docs
3. Make a short plan
4. Implement in one cohesive vertical slice
5. Update docs at the end

Rules:
- keep the domain generic
- do not hardcode the demo business into core logic
- prefer simple explicit code
- avoid unnecessary dependencies

Done when:
- flow works end-to-end
- lint/typecheck pass
- docs are updated
- ITERATION_LOG is updated
