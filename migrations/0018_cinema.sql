CREATE TABLE IF NOT EXISTS nf_movies (
  id TEXT PRIMARY KEY,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'global',
  status TEXT NOT NULL DEFAULT 'pending',
  watching INTEGER NOT NULL DEFAULT 0,
  votes INTEGER NOT NULL DEFAULT 0,
  submitter TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  ts BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS nf_movies_yt ON nf_movies (youtube_id);

CREATE TABLE IF NOT EXISTS nf_votes (
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  day TEXT NOT NULL,
  ts BIGINT NOT NULL,
  PRIMARY KEY (user_id, movie_id, day)
);

INSERT INTO nf_movies (id, youtube_id, title, section, status, watching, votes, submitter, ts) VALUES
  ('seed-black-book', 'lQjFGCqE_6E', 'The Black Book', 'nigerian', 'approved', 1, 12, 'Kilode', 1726700000000),
  ('seed-kob', 'oqkz5k3f1nA', 'King of Boys', 'nigerian', 'approved', 0, 9, 'Kilode', 1726700001000),
  ('seed-woman-king', '3RDaPV_rJ1Y', 'The Woman King', 'nigerian', 'approved', 0, 7, 'Kilode', 1726700002000),
  ('seed-bp', 'xjDjIWPwcPU', 'Black Panther', 'global', 'approved', 0, 11, 'Kilode', 1726700003000),
  ('seed-wakanda', '_Z3QKkl1WyM', 'Black Panther: Wakanda Forever', 'global', 'approved', 0, 8, 'Kilode', 1726700004000),
  ('seed-c2a', 'sYc1gUwXJk0', 'Coming 2 America', 'global', 'approved', 0, 5, 'Kilode', 1726700005000),
  ('seed-dune', '8g18jFHCLXk', 'Dune', 'coming', 'approved', 0, 4, 'Kilode', 1726700006000),
  ('seed-endgame', 'TcMBFSGVi1c', 'Avengers: Endgame', 'coming', 'approved', 0, 6, 'Kilode', 1726700007000)
ON CONFLICT (id) DO NOTHING;
