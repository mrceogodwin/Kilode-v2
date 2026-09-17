-- News Engine drafts: RSS ingest → AI/human rewrite → staff approve → Feeds
CREATE TABLE IF NOT EXISTS nf_news_drafts (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  original_title TEXT NOT NULL,
  original_link TEXT NOT NULL,
  original_snippet TEXT,
  pub_date BIGINT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta_description TEXT,
  tags TEXT,
  category TEXT,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  approved_post_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS nf_news_drafts_link_uidx ON nf_news_drafts (original_link);
CREATE INDEX IF NOT EXISTS nf_news_drafts_status_idx ON nf_news_drafts (status, updated_at DESC);
