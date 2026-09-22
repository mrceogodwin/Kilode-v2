create table if not exists nf_socials (
  id text primary key,
  name text not null,
  handle text not null default '',
  url text not null default '',
  blurb text not null default '',
  thumb text not null default '',
  followers text not null default '',
  sort int not null default 0
);
