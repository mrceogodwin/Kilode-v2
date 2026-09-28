CREATE TABLE IF NOT EXISTS nf_spaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  handle TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Draft',
  visitors INT NOT NULL DEFAULT 0,
  enquiries INT NOT NULL DEFAULT 0,
  whatsapp TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT '',
  ts BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS nf_space_items (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'service',
  title TEXT NOT NULL,
  badge TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  active INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS nf_spaces_user ON nf_spaces (user_id, ts DESC);
CREATE INDEX IF NOT EXISTS nf_space_items_space ON nf_space_items (space_id, kind);
