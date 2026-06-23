# ERD — Data model overview

This document describes the core data models inferred from the project `entities/` definitions and their relationships.

```mermaid
erDiagram
    USERS {
        string id PK
        string name
        string role
        string email
    }

    INSPECTION_SESSION {
        string id PK
        string container_id
        string shipper_name
        string inspection_type
        string location_name
        number latitude
        number longitude
        string status
        string notes
        string verified_by_name
        datetime verified_at
        string admin_comment
        string inspector_name
        number photo_count
        string ocr_serial
        boolean archived
        string created_by_id FK
    }

    INSPECTION_PHOTO {
        string id PK
        string session_id FK
        string photo_url
        string photo_angle
        number file_size_kb
        string resolution
        string device_info
        string ocr_detected_serial
        string ocr_confirmed_serial
        number ocr_confidence
        boolean ocr_processed
        boolean is_corrected
        json damage_labels
        string created_by_id FK
    }

    AUDIT_LOG {
        string id PK
        string action
        string entity_type
        string entity_id
        string user_name
        string details
        datetime created_at
        string created_by_id FK
    }

    USERS ||--o{ INSPECTION_SESSION : "creates"
    INSPECTION_SESSION ||--o{ INSPECTION_PHOTO : "has"
    USERS ||--o{ INSPECTION_PHOTO : "uploads"
    USERS ||--o{ AUDIT_LOG : "records"
    INSPECTION_SESSION ||--o{ AUDIT_LOG : "logged-for"
```

Notes:
- `InspectionSession` is the central aggregate representing an inspection of a container.
- `InspectionPhoto` stores uploaded photos and OCR/damage metadata and references `InspectionSession` via `session_id`.
- `AuditLog` stores activity events (create/update/delete/verify/export/login/etc.) and references entities via `entity_type` + `entity_id`.
