CREATE TABLE IF NOT EXISTS nf_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  ts BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS nf_ads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT,
  placement TEXT NOT NULL,
  status TEXT NOT NULL,
  amount TEXT,
  tx_hash TEXT,
  ts BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS nf_msgs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  n TEXT NOT NULL,
  t TEXT NOT NULL,
  ts BIGINT NOT NULL
);
