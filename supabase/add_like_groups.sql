alter table likes
  add column if not exists group_names text[] not null default '{}';

alter table likes
  add constraint chk_likes_groups
  check (group_names <@ ARRAY['씨앗','새싹','봄꽃','사과','나무','어른']::text[]);

create index if not exists idx_likes_group_names on likes using gin (group_names);
