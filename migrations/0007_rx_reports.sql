CREATE TABLE IF NOT EXISTS nf_rx (
  room_id TEXT NOT NULL,
  ts BIGINT NOT NULL,
  kind TEXT NOT NULL,
  n INT NOT NULL,
  PRIMARY KEY (room_id, ts, kind)
);

CREATE TABLE IF NOT EXISTS nf_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author TEXT NOT NULL,
  reason TEXT NOT NULL,
  ts BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS nf_joins (
  name TEXT PRIMARY KEY,
  room TEXT,
  ts BIGINT NOT NULL
);
