-- Cursor for Hobby-safe email digest fan-out (last post ts / last run).
CREATE TABLE IF NOT EXISTS nf_digest_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
