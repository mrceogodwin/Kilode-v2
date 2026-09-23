-- Listing showcase photo (compressed data URL or https) — Vendor / Renter / Brand market tiles.
ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS image TEXT;
