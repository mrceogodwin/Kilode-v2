CREATE TABLE IF NOT EXISTS nf_i18n (
  id TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  src TEXT NOT NULL,
  out TEXT NOT NULL,
  ts BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS nf_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  href TEXT,
  ts BIGINT NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS nf_notes_user_idx ON nf_notes (user_id, ts DESC);

CREATE TABLE IF NOT EXISTS nf_dm (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  from_handle TEXT NOT NULL,
  to_handle TEXT NOT NULL,
  to_user_id TEXT,
  body TEXT NOT NULL,
  ts BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS nf_dm_to_idx ON nf_dm (to_handle, ts DESC);
CREATE INDEX IF NOT EXISTS nf_dm_from_idx ON nf_dm (from_id, ts DESC);
