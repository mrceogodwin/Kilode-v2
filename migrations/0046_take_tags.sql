CREATE TABLE IF NOT EXISTS nf_take_tags (
  take_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  ts BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (take_id, tag)
);

CREATE INDEX IF NOT EXISTS nf_take_tags_tag ON nf_take_tags (tag, ts DESC);
