CREATE TABLE IF NOT EXISTS nf_site (
  id INT PRIMARY KEY,
  chat_ttl_hours INT NOT NULL DEFAULT 24,
  ts BIGINT NOT NULL
);

INSERT INTO nf_site (id, chat_ttl_hours, ts)
VALUES (1, 24, 0)
ON CONFLICT (id) DO NOTHING;
