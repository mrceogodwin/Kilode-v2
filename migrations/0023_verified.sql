ALTER TABLE nf_profiles ADD COLUMN IF NOT EXISTS verified INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS nf_profiles_verified ON nf_profiles (verified) WHERE verified = 1;
