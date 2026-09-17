CREATE TABLE IF NOT EXISTS nf_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  category TEXT,
  tags TEXT,
  link TEXT,
  image TEXT,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'publish',
  author TEXT NOT NULL,
  ts BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS nf_tracks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,
  embed TEXT,
  cover TEXT,
  genre TEXT,
  album TEXT,
  note TEXT,
  tags TEXT,
  author TEXT NOT NULL,
  ts BIGINT NOT NULL
);
