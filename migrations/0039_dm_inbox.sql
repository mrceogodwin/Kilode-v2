ALTER TABLE nf_dm ADD COLUMN IF NOT EXISTS to_user_id TEXT;
CREATE INDEX IF NOT EXISTS nf_dm_to_user_idx ON nf_dm (to_user_id, ts DESC);
