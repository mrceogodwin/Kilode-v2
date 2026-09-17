INSERT INTO nf_wallets (coin, address, ts) VALUES
  ('btc', 'bc1qzttekprl8khj06kzckld3kwmh3tghzgt6vevug', 1726700000000),
  ('sol', 'Dj9UHi549gcqcU8nHDFdFTLAScubChrVaKbDv2rwgCGE', 1726700000000),
  ('eth', '0x6199542599eEb56Eec2F6A35F21Dd478Ea14983e', 1726700000000)
ON CONFLICT (coin) DO UPDATE SET address = EXCLUDED.address, ts = EXCLUDED.ts;
