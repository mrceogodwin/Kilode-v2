CREATE TABLE IF NOT EXISTS nf_follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  ts BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS nf_follows_followee ON nf_follows (followee_id, ts DESC);
