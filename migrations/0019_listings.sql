CREATE TABLE IF NOT EXISTS nf_listings (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  submitter TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  ts BIGINT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS nf_listings_kind_status ON nf_listings (kind, status, ts DESC);

CREATE TABLE IF NOT EXISTS nf_apps (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  ts BIGINT NOT NULL
);
