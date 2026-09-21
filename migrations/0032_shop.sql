create table if not exists nf_products (
  id text primary key,
  title text not null,
  kind text not null default 'app',
  blurb text not null default '',
  details text not null default '',
  cover text not null default '',
  price text not null default 'Free',
  download_url text not null default '',
  status text not null default 'publish',
  ts bigint not null
);

create table if not exists nf_product_leads (
  id text primary key,
  product_id text not null,
  email text not null,
  ts bigint not null
);
