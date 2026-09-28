CREATE TABLE IF NOT EXISTS nf_checkouts (
  reference TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL,
  amount_usd INTEGER NOT NULL,
  amount_ngn INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  used_by TEXT NOT NULL DEFAULT '',
  ts BIGINT NOT NULL,
  paid_at BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS nf_checkouts_user ON nf_checkouts (user_id, ts DESC);
