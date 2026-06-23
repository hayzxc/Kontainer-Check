# Engineering Instructions

This repository is an inspection-management application with a React/Vite frontend and a Node backend. Make the smallest complete change that solves the requested problem, and prove that it works.

## Reasoning standard

Before editing, establish the facts:

1. Restate the intended observable outcome in one sentence.
2. Trace the current behavior from entry point to state, API, and persistence as applicable. Do not infer file ownership or data shape from a filename.
3. Identify the invariant that must remain true (for example authorization, status transitions, totals, or auditability).
4. Choose the narrowest implementation that preserves that invariant. Prefer existing patterns, utilities, components, and dependencies.

For a non-trivial change, explicitly check this causal chain before declaring it done:

`user action -> UI state -> request -> validation/authorization -> persistence -> response -> UI refresh`

Do not add abstractions, configuration, dependencies, fallbacks, or refactors unless they are necessary for the requested outcome or clearly eliminate a demonstrated problem.

## Change rules

- Read the relevant caller and consumer before changing an API, component, schema, shared helper, or entity.
- Preserve public contracts unless the task specifically changes them. If a contract must change, update every in-repository consumer in the same change.
- Keep one source of truth for each piece of state. Derive display values instead of duplicating state.
- Treat backend input as untrusted: validate shape, required fields, ranges, ownership, and role permissions server-side.
- Enforce authorization at the backend/data boundary, not only by hiding frontend controls.
- Make status transitions explicit. Inspection lifecycle changes must remain compatible with the workflow in `WORKFLOW.md`.
- Record important inspection actions (create, submit, verify, export, login, upload) in the audit path when applicable.
- Handle loading, empty, success, and failure states for user-facing asynchronous operations.
- Avoid broad catch blocks and silent fallbacks. Return or surface actionable errors with enough context to diagnose the failure, without exposing secrets.
- Do not log credentials, tokens, personally sensitive data, or full request headers.

## Frontend guidelines

- Use existing React, Tailwind, Radix, and project component patterns before creating a new primitive.
- Keep domain logic out of presentational components where a focused hook, helper, or backend endpoint is more appropriate.
- Make UI updates optimistic only when rollback and error handling are defined.
- Preserve keyboard access, focus behavior, labels, semantic controls, and responsive layout when editing UI.
- Do not use array indices as React keys when a stable record identifier exists.

## Backend and data guidelines

- Keep request parsing, validation, authorization, domain logic, and response formatting distinct enough to test and reason about.
- Check ownership and role permissions on every read or mutation involving inspection data, photos, reports, or audit records.
- Prefer idempotent operations where retries are plausible, especially uploads, submissions, exports, and audit events.
- Do not change persisted entity fields or status values without searching all readers, writers, filters, and reports.
- Keep OCR processing decoupled from photo upload; do not make an inspection depend on synchronous OCR completion unless the requirement explicitly demands it.

## Verification

Run the narrowest relevant check after each change, then expand verification with risk:

- UI-only change: run `npm run build`; manually exercise the changed state when possible.
- Backend/API change: exercise valid, invalid, unauthorized, and not-found cases.
- Workflow, status, permission, or persistence change: test the affected transition end to end and confirm audit behavior.
- Authentication/load behavior: run `npm run test:login-load` when applicable.

Before handoff, review the diff and answer:

1. What exact behavior changed?
2. Which invariant or edge case could regress?
3. What evidence verifies the result?

Report only completed work. If verification was not run, state that plainly with the reason.

## Commands

```bash
npm run dev          # Vite frontend
npm run backend      # Node backend
npm run dev:full     # frontend and backend
npm run build        # production build
npm run test:login-load
```
