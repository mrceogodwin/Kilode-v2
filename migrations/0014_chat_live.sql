ALTER TABLE nf_msgs ADD COLUMN IF NOT EXISTS parent_ts BIGINT;
ALTER TABLE nf_msgs ADD COLUMN IF NOT EXISTS parent_n TEXT;
ALTER TABLE nf_msgs ADD COLUMN IF NOT EXISTS parent_t TEXT;

CREATE INDEX IF NOT EXISTS nf_msgs_room_ts ON nf_msgs (room_id, ts);

CREATE TABLE IF NOT EXISTS nf_presence (
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  typing_until BIGINT NOT NULL DEFAULT 0,
  seen BIGINT NOT NULL,
  PRIMARY KEY (user_id, room_id)
);
CREATE INDEX IF NOT EXISTS nf_presence_room_seen ON nf_presence (room_id, seen);

CREATE TABLE IF NOT EXISTS nf_mod_users (
  user_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT,
  by_id TEXT,
  ts BIGINT NOT NULL,
  until_ts BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS nf_mod_users_handle ON nf_mod_users (handle);
