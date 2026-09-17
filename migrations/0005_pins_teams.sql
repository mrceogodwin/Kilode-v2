CREATE TABLE IF NOT EXISTS nf_pins (
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  ts BIGINT NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE IF NOT EXISTS nf_teams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  members TEXT NOT NULL,
  ts BIGINT NOT NULL
);
