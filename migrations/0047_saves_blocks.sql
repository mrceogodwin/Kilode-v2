CREATE TABLE IF NOT EXISTS nf_take_saves (
  user_id TEXT NOT NULL,
  take_id TEXT NOT NULL,
  ts BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, take_id)
);

CREATE INDEX IF NOT EXISTS nf_take_saves_user ON nf_take_saves (user_id, ts DESC);

CREATE TABLE IF NOT EXISTS nf_blocks (
  user_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  ts BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS nf_blocks_blocked ON nf_blocks (blocked_id);
