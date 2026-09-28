-- Extra job / marketplace fields (type, category, price, condition) without a second database.
ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS meta TEXT;
