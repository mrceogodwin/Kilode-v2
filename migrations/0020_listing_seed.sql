INSERT INTO nf_listings (id, kind, title, body, city, contact, link, company, status, submitter, ts, views) VALUES
  ('seed-job-1', 'job', 'Frontend designer — Lagos', 'Remote-friendly. Figma + React. Apply with a short note.', 'Lagos', 'jobs@example.ng', '', 'Kilode Studio', 'approved', 'Kilode', 1726800000000, 12),
  ('seed-job-2', 'job', 'Content writer — Abuja', 'Naija news and culture. 5 posts a week.', 'Abuja', 'desk@example.ng', '', 'Kilode Desk', 'approved', 'Kilode', 1726800001000, 8),
  ('seed-mkt-1', 'market', 'Ankara two-piece set', 'Made in Aba. WhatsApp to order. No in-app checkout.', 'Aba', 'wa.me/234000000000', 'https://instagram.com', 'Adire Co', 'approved', 'Kilode', 1726800002000, 21),
  ('seed-rent-1', 'rent', 'Self-con in Yaba', 'New tiles, prepaid meter. Agent contact on listing. No rent paid in Kilode.', 'Lagos', 'agent@example.ng', '', 'Yaba Lets', 'approved', 'Kilode', 1726800003000, 6)
ON CONFLICT (id) DO NOTHING;
