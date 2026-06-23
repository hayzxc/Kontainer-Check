-- backend/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL DEFAULT '',
  full_name      TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL DEFAULT 'inspector',
  password_hash  TEXT NOT NULL,
  reset_token    TEXT,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inspection_sessions (
  id                TEXT PRIMARY KEY,
  container_id      TEXT NOT NULL,
  shipper_name      TEXT NOT NULL DEFAULT '',
  inspection_type   TEXT NOT NULL,
  location_name     TEXT NOT NULL,
  latitude          NUMERIC,
  longitude         NUMERIC,
  status            TEXT NOT NULL DEFAULT 'draft',
  notes             TEXT NOT NULL DEFAULT '',
  verified_by_name  TEXT NOT NULL DEFAULT '',
  verified_at       TIMESTAMPTZ,
  admin_comment     TEXT NOT NULL DEFAULT '',
  inspector_name    TEXT NOT NULL DEFAULT '',
  photo_count       INTEGER NOT NULL DEFAULT 0,
  ocr_serial        TEXT NOT NULL DEFAULT '',
  archived          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_photos (
  id                    TEXT PRIMARY KEY,
  session_id            TEXT NOT NULL REFERENCES inspection_sessions(id) ON DELETE CASCADE,
  photo_url             TEXT NOT NULL,
  photo_angle           TEXT NOT NULL,
  file_size_kb          NUMERIC NOT NULL DEFAULT 0,
  resolution            TEXT NOT NULL DEFAULT '',
  device_info           TEXT NOT NULL DEFAULT '',
  ocr_detected_serial   TEXT NOT NULL DEFAULT '',
  ocr_confirmed_serial  TEXT NOT NULL DEFAULT '',
  ocr_confidence        NUMERIC NOT NULL DEFAULT 0,
  ocr_processed         BOOLEAN NOT NULL DEFAULT FALSE,
  is_corrected          BOOLEAN NOT NULL DEFAULT FALSE,
  damage_labels         JSONB NOT NULL DEFAULT '[]',
  created_by_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id             TEXT PRIMARY KEY,
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT NOT NULL DEFAULT '',
  user_name      TEXT NOT NULL DEFAULT '',
  details        TEXT NOT NULL DEFAULT '',
  created_by_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_created_by ON inspection_sessions(created_by_id);
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_status     ON inspection_sessions(status);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_session_id   ON inspection_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at          ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id               ON sessions(user_id);
