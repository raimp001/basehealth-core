# BaseHealth Super-App Blueprint (Patient + Provider + Agent Mesh)

This blueprint translates the product vision into implementation priorities for a patient-first platform that also supports provider workflows, wallet identity, and interoperable healthcare operations.

## Current gaps identified

1. **Payment verification and wallet identity mismatch risks**
   - Payment verification can fail closed only if session-wallet and on-chain sender are bound and validated consistently across routes.
   - Solana verification must parse actual transfer instructions (not only confirmation status).

2. **Fragmented orchestration across clinical domains**
   - Existing agents are useful but need a clear orchestration contract for handoff between intake, triage, booking, billing, and records.

3. **Provider workflow completeness**
   - Provider onboarding, charting/scribing, order entry, and follow-up communication need a single lifecycle model.

4. **External ecosystem integration strategy**
   - Insurance eligibility/prior-auth, pharmacy routing, labs/radiology order/results, and EMR read/write should follow explicit integration adapters.

## Target architecture

## 1) Identity and trust layer
- Wallet-first sign-in for patients and providers with account linking to existing email-based profiles.
- Session-bound payer identity checks for on-chain payment verification.
- Admin and compliance policy checks for sensitive transitions (approvals, payouts, chart access).

## 2) Unified care timeline
- Longitudinal `CareTimeline` aggregate combining:
  - encounters,
  - orders (labs/radiology/prescriptions),
  - results,
  - claims/payment events,
  - messaging and care tasks.
- Every agent and UI surface should read/write through this timeline abstraction.

## 3) Open Cloud Agent Mesh orchestration
- Introduce a **Care Orchestrator** that:
  - routes intent to specialist agents,
  - enforces handoff contracts,
  - records structured output into timeline tasks.
- Required specialist groups:
  - Intake/Triage,
  - Scheduling,
  - Documentation/Scribe,
  - Evidence assistant,
  - Revenue-cycle/claims,
  - Referral + records exchange.

## 4) Provider workspace model
- Provider dashboard should support:
  - queue + patient context,
  - AI scribe note draft and coding hints,
  - order composer for labs/radiology/pharmacy,
  - result triage inbox,
  - billing/claim status and denial worklist.

## 5) Integration adapters
Implement adapter interfaces for:
- **EMR/EHR**: demographics, problems, meds, allergies, encounters, orders/results.
- **Insurance**: eligibility, estimate, prior auth, claim submit/status.
- **Pharmacy**: eRx routing + dispense status.
- **Labs/Radiology**: order placement + result ingestion + abnormal alerts.

Use per-partner adapters behind normalized service interfaces to avoid vendor lock-in.

## Execution plan (90-day incremental)

### Phase 1 (Weeks 1-3): Security and reliability baseline
- Finish payment verification hardening and route-level auth consistency.
- Add targeted route tests for payment verification and auth failure modes.
- Add structured audit events for critical state transitions.

### Phase 2 (Weeks 4-6): Agent orchestration contracts
- Define agent handoff schema (intent, confidence, required follow-up actions).
- Persist agent actions as timeline tasks.
- Add guardrails and fallback rules for uncertain/unsafe outputs.

### Phase 3 (Weeks 7-9): Provider workflow MVP
- Provider queue + encounter note draft (scribe-assisted).
- Basic order composer for labs/radiology/prescriptions.
- Result inbox linked back to timeline events.

### Phase 4 (Weeks 10-12): Integration expansion
- Add first real EMR adapter and insurance eligibility adapter.
- Add lab/radiology status webhooks and pharmacy fill-status polling.
- Add operational analytics: conversion, no-shows, claim lag, abnormal result follow-up SLA.

## Product quality bars

- **Safety**: hard fail on missing auth/authorization for financial and PHI-critical actions.
- **Interoperability**: all external integrations behind typed adapter contracts.
- **Observability**: every critical workflow has audit + telemetry events.
- **User simplicity**: patient flows stay low-friction, provider flows stay high-context and fast.

