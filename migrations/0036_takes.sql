CREATE TABLE IF NOT EXISTS nf_takes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'take',
  body TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '{}',
  fact INTEGER NOT NULL DEFAULT 0,
  cap INTEGER NOT NULL DEFAULT 0,
  vote_a INTEGER NOT NULL DEFAULT 0,
  vote_b INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  reposts INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  ts BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS nf_takes_ts ON nf_takes (ts DESC);

CREATE TABLE IF NOT EXISTS nf_take_votes (
  take_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  side TEXT NOT NULL,
  PRIMARY KEY (take_id, user_id)
);

CREATE TABLE IF NOT EXISTS nf_take_likes (
  take_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (take_id, user_id)
);

CREATE TABLE IF NOT EXISTS nf_take_replies (
  id TEXT PRIMARY KEY,
  take_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  body TEXT NOT NULL,
  ts BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS nf_take_replies_take ON nf_take_replies (take_id, ts DESC);

CREATE TABLE IF NOT EXISTS nf_fellows (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  line TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nf_connects (
  user_id TEXT NOT NULL,
  fellow_id TEXT NOT NULL,
  PRIMARY KEY (user_id, fellow_id)
);
