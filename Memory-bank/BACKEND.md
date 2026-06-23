# Backend — API surface and implementation notes

This document describes suggested API endpoints, request/response shapes, authorization requirements, RLS summaries, and processing concerns inferred from the project.

## Actors / Roles
- `inspector` — creates sessions, uploads photos, reviews OCR, submits for verification.
- `admin` — verifies/submits decisions, can delete or override.
- `auditor` — read-only access to sessions and photos for auditing and reporting.
- `shipper` — may view related reports (optional depending on product scope).

## Core models
- `InspectionSession` — main aggregate for an inspection. See `entities/InspectionSession`.
- `InspectionPhoto` — photo + OCR + damage metadata. See `entities/InspectionPhoto`.
- `AuditLog` — activity log. See `entities/AuditLog`.

## Suggested API endpoints

- List sessions (with filtering/pagination)
  - GET /api/inspection-sessions
  - Roles: inspector (own), admin, auditor

- Create session
  - POST /api/inspection-sessions
  - Body: session fields (`container_id`, `inspection_type`, `location_name`, ...)
  - Roles: inspector

- Get session
  - GET /api/inspection-sessions/:id
  - Roles: inspector (own), admin, auditor

- Update session (partial)
  - PATCH /api/inspection-sessions/:id
  - Roles: inspector (own, when status in [draft, clarification]), admin

- Submit session
  - POST /api/inspection-sessions/:id/submit
  - Action: mark status=`pending`, create AuditLog(action=submit)
  - Roles: inspector

- Upload photo
  - POST /api/inspection-sessions/:id/photos
  - Body: multipart/form-data file; metadata e.g. `photo_angle`
  - Action: store file (S3/Cloud Storage), create `InspectionPhoto` with `photo_url`, enqueue OCR
  - Roles: inspector

- Get photo
  - GET /api/photos/:id
  - Roles: inspector (own), admin, auditor

- Request OCR re-run / confirm OCR
  - POST /api/photos/:id/ocr
  - Body: { action: "rerun" } or inspector confirmation updates (`ocr_confirmed_serial`, `is_corrected`)
  - Roles: inspector (own), admin

- Admin verify/decision
  - POST /api/inspection-sessions/:id/verify
  - Body: { decision: "approve" | "reject" | "clarify", admin_comment }
  - Action: set status, write AuditLog(action=verify)
  - Roles: admin

- Audit logs
  - GET /api/audit-logs (filter by entity_type, entity_id, date range)
  - Roles: admin, auditor

## Request / Response sketches
- POST /api/inspection-sessions
  - Request body: JSON matching `InspectionSession` properties
  - Response: 201 Created with created session object including `id`

- POST /api/inspection-sessions/:id/photos
  - Request: multipart file + JSON metadata
  - Response: 201 Created with `InspectionPhoto` record

## RLS / Authorization summary
- From `entities/*` files the rules are:
  - Create: user must be authenticated (id exists)
  - Read: admin/auditor can read broadly; normal inspectors can read their own records (`created_by_id`)
  - Update: inspectors can update own drafts/clarifications; admins can update any
  - Delete: typically admin-only (photos may be deletable by creators too)

Implement these checks at the API/service layer and/or database row-level security (e.g., Postgres RLS) using `created_by_id` and `role` claims from the authenticated user.

## Storage & background processing
- Photo storage: S3/Cloud Storage or signed URL uploads; store `photo_url` in `InspectionPhoto`.
- OCR: use a background worker (queue) to process new photos, populate `ocr_detected_serial`, `ocr_confidence`, set `ocr_processed=true`.
- Damage detection: optional ML/vision job; store results into `damage_labels` array on `InspectionPhoto`.

## Audit logging
- Create `AuditLog` entries for: create session, upload photo, submit session, verify/approve/reject, export/report, login, OCR processed.

## Migration / DB suggestions
- Tables: `users`, `inspection_sessions`, `inspection_photos`, `audit_logs`.
- Indexes: `inspection_sessions.created_by_id`, `inspection_photos.session_id`, `audit_logs.entity_type, entity_id`.

## Notes / Next steps
- Wire up authentication to provide `user.id` and `user.role` to the API.
- Configure Gmail OTP verification in `.env` with `EMAIL_USER` and a 16-character Google App Password in `EMAIL_PASS`. The shared `auth-verify` verifier creates six-digit codes, expires them after 10 minutes, limits verification attempts to five, and enforces a 60-second resend cooldown.
- Implement tests for RLS/authorization to enforce the entity rules.
- Consider retention/archive policies for photos and sessions (e.g., when `archived=true`).
