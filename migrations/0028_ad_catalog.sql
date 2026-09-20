create table if not exists nf_ad_catalog (
  k text primary key,
  v text not null
);

insert into nf_ad_catalog (k, v) values
  ('daily_cap', '40'),
  ('page_size', '12'),
  ('featured_n', '8'),
  ('price_board', '40'),
  ('price_featured', '150'),
  ('price_square', '90'),
  ('price_chat', '250'),
  ('price_chat_pin', '800'),
  ('price_feeds_strip', '180'),
  ('price_story', '400'),
  ('price_article_leader', '220'),
  ('price_article_mid', '150'),
  ('price_cinema', '300')
on conflict (k) do nothing;
