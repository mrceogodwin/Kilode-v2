CREATE TABLE IF NOT EXISTS nf_take_reposts (
  take_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ts BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (take_id, user_id)
);

ALTER TABLE nf_take_reposts ADD COLUMN IF NOT EXISTS ts BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS nf_take_reposts_user ON nf_take_reposts (user_id, ts DESC);

CREATE TABLE IF NOT EXISTS nf_mutes (
  user_id TEXT NOT NULL,
  muted_id TEXT NOT NULL,
  ts BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, muted_id)
);
