CREATE TABLE IF NOT EXISTS nf_mod_settings (
  id INT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  action TEXT NOT NULL DEFAULT 'mask',
  chat BOOLEAN NOT NULL DEFAULT TRUE,
  feeds BOOLEAN NOT NULL DEFAULT TRUE,
  comments BOOLEAN NOT NULL DEFAULT TRUE,
  ads BOOLEAN NOT NULL DEFAULT TRUE,
  music BOOLEAN NOT NULL DEFAULT TRUE,
  sexual BOOLEAN NOT NULL DEFAULT TRUE,
  insults BOOLEAN NOT NULL DEFAULT TRUE,
  scam BOOLEAN NOT NULL DEFAULT TRUE,
  links BOOLEAN NOT NULL DEFAULT FALSE,
  shout BOOLEAN NOT NULL DEFAULT FALSE,
  custom TEXT,
  allow_list TEXT,
  ts BIGINT NOT NULL
);

INSERT INTO nf_mod_settings (id, enabled, action, chat, feeds, comments, ads, music, sexual, insults, scam, links, shout, custom, allow_list, ts)
VALUES (1, TRUE, 'mask', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, '', '', 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS nf_mod_hits (
  id TEXT PRIMARY KEY,
  surface TEXT NOT NULL,
  action TEXT NOT NULL,
  hits TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body TEXT,
  room_id TEXT,
  user_id TEXT,
  author TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  ts BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS nf_mod_hits_ts ON nf_mod_hits (ts DESC);
