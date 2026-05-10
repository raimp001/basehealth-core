# Monetization Opportunity Layer

Yes — we should have a dedicated layer for monetization/business opportunity tracking.

This layer operationalizes the opportunity framework into an executable system:

- Capture opportunities from market/business/technology/regulatory/consumer signals.
- Score opportunities based on expected value, asymmetry, execution difficulty, capital requirement, and time horizon.
- Rank and manage opportunities through explicit statuses (`new`, `watching`, `accepted`, `rejected`).
- Emit care events and audit logs for accountability.

## APIs

- `POST /api/runtime/monetization`
  - Create and score a monetization opportunity.
- `GET /api/runtime/monetization`
  - List ranked opportunities.
- `GET /api/runtime/monetization/:id`
  - View one opportunity.
- `PATCH /api/runtime/monetization/:id`
  - Update status.

## Why this helps

- Converts “interesting ideas” into a structured decision funnel.
- Prioritizes risk-adjusted upside using a repeatable scoring rubric.
- Gives you a persistent operational place to track business value creation alongside product/clinical work.
