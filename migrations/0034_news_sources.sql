create table if not exists nf_news_sources (
  id text primary key,
  enabled integer not null default 1
);
