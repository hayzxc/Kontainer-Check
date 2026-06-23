# Inspection workflow (high-level)

This document captures the main user and backend workflow for inspections based on the codebase and entity definitions.

```mermaid
flowchart TD
  A[Start: New Inspection] --> B[Create `InspectionSession` (draft)]
  B --> C[Upload photos -> create `InspectionPhoto` records]
  C --> D[OCR job queued for photos]
  D --> E[OCR processor updates photo fields (`ocr_detected_serial`, `ocr_confidence`, `ocr_processed`)]
  E --> F[Inspector reviews OCR results and damage labels]
  F --> G{Inspector action}
  G -- Save Draft --> B
  G -- Submit --> H[Session status = `pending`]
  H --> I[Admin/Auditor reviews session and photos]
  I --> J{Decision}
  J -- Approve --> K[status = `approved` -> generate report / export]
  J -- Reject --> L[status = `rejected` -> admin_comment set]
  J -- Need Clarification --> M[status = `clarification` -> request more info]
  K --> N[Create `AuditLog` entry (action=verify/export/...)]
  L --> N
  M --> N
  N --> O[End]
```

Notes:
- Photo uploads and OCR are decoupled: a background worker processes OCR and writes back to `InspectionPhoto`.
- RLS (role-based checks) restricts read/update/delete according to the entity definitions (inspectors can edit their own drafts; admins/auditors can read more broadly).
- `AuditLog` entries should be written for important actions: create, submit, verify, export, login, upload.
