-- 주제 태그 개편 v2 되돌리기 — 마이그레이션 '커밋 후' 문제가 생겼을 때만 실행
-- (마이그레이션 도중 오류는 자동으로 전부 되돌아가므로 이 파일이 필요 없음)
-- ⚠️ 개편 후 새로 쓴 기록의 태그 연결은 사라진다. 배포 직후 바로 쓸 것.
begin;

-- 1) 연결: 백업으로 통째 복원 (seq는 identity라 overriding system value로 원래 번호 유지)
delete from public.post_tags;
alter table public.post_tags drop constraint if exists post_tags_source_check;
alter table public.post_tags drop column if exists source;
insert into public.post_tags (id, post_id, tag_id, custom_tag, is_operator_tag, seq)
  overriding system value
  select id, post_id, tag_id, custom_tag, is_operator_tag, seq from public.post_tags_bak_20261028;

-- 1-1) 피드 뷰를 개편 전 정의로 (뷰가 slug 열을 쓰고 있어서 먼저 되돌려야 열을 지울 수 있음)
drop view if exists public.book_feed_cards;
create view public.book_feed_cards
with (security_invoker = true) as
select
  b.id                              as book_id,
  b.book_key,
  b.title,
  b.cover_image_url,
  b.published_date,
  coalesce(b.bookmark_count, 0)     as bookmark_count,
  coalesce(b.is_board_book, false)  as is_board_book,
  s.record_count,
  s.recommend_count,
  s.reaction,
  s.density,
  s.latest_created_at,
  s.group_post_counts,
  s.op_topics,
  s.op_categories,
  s.custom_topics
from public.books b
cross join lateral (
  select
    -- 기록 수(반응 무관, 숨김 제외)
    (select count(*)::int from public.posts p
      where p.book_id = b.id and p.hidden_at is null)                                   as record_count,
    -- 추천한 사람 수(user당 1행)
    (select count(*)::int from public.likes l where l.book_id = b.id)                  as recommend_count,
    -- 대표 반응 = 자격 기록 최빈값(동률이면 큰 값)
    (select p.child_reaction from public.posts p
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
      group by p.child_reaction
      order by count(*) desc, p.child_reaction desc limit 1)                            as reaction,
    -- 글밥량 대표값 = 전체 기록 최빈값(동률이면 큰 값), 없으면 0
    coalesce((select p.text_density from public.posts p
      where p.book_id = b.id and p.hidden_at is null and p.text_density is not null
      group by p.text_density
      order by count(*) desc, p.text_density desc limit 1), 0)                         as density,
    -- 최신 자격 기록 시각
    (select max(p.created_at) from public.posts p
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2)         as latest_created_at,
    -- 시기별 자격 기록 수 {"꽃잎": 2, ...} — 키 = 이 책의 시기 합집합, 값 합산 = 시기별 누적 기록 수
    coalesce((select jsonb_object_agg(t.group_name, t.c) from (
      select pg.group_name, count(*)::int as c
      from public.posts p join public.post_groups pg on pg.post_id = p.id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
      group by pg.group_name) t), '{}'::jsonb)                                          as group_post_counts,
    -- 운영자 태그명: 가장 최근 기록에 처음 등장한 순(같은 기록 안에서는 저장 순서 seq)
    coalesce((select array_agg(t.name order by t.last_seen desc, t.first_seq) from (
      select distinct on (ot.name) ot.name, p.created_at as last_seen, pt.seq as first_seq
      from public.posts p
      join public.post_tags pt on pt.post_id = p.id
      join public.operator_tags ot on ot.id = pt.tag_id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and pt.is_operator_tag
      order by ot.name, p.created_at desc, pt.seq) t), '{}')                            as op_topics,
    -- 운영자 태그 카테고리(커스텀 태그 중복 제거용)
    coalesce((select array_agg(distinct ot.tag_category)
      from public.posts p
      join public.post_tags pt on pt.post_id = p.id
      join public.operator_tags ot on ot.id = pt.tag_id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and pt.is_operator_tag and ot.tag_category is not null), '{}')                  as op_categories,
    -- 커스텀 태그: 가장 최근 기록에 처음 등장한 순(같은 기록 안에서는 저장 순서 seq)
    coalesce((select array_agg(t.custom_tag order by t.last_seen desc, t.first_seq) from (
      select distinct on (pt.custom_tag) pt.custom_tag, p.created_at as last_seen, pt.seq as first_seq
      from public.posts p join public.post_tags pt on pt.post_id = p.id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and not pt.is_operator_tag and pt.custom_tag is not null
      order by pt.custom_tag, p.created_at desc, pt.seq) t), '{}')                      as custom_topics
) s
where exists (  -- 피드 노출 자격 기록이 1건 이상인 책만
  select 1 from public.posts p
  where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
);
grant select on public.book_feed_cards to anon, authenticated;

-- 2) 태그: 새 컬럼부터 지움 (세부→상위 연결이 남아 있으면 새 태그를 지울 수 없음)
alter table public.operator_tags drop constraint if exists operator_tags_parent_check;
alter table public.operator_tags drop constraint if exists operator_tags_level_check;
drop index if exists public.operator_tags_slug_key;
alter table public.operator_tags drop column if exists parent_id, drop column if exists slug,
  drop column if exists level, drop column if exists chip_example, drop column if exists search_aliases,
  drop column if exists intro_keywords, drop column if exists intro_excludes;
delete from public.operator_tags where id not in (select id from public.operator_tags_bak_20261028);
update public.operator_tags o
   set name = b.name, tag_category = b.tag_category, is_active = b.is_active, sort_order = b.sort_order
  from public.operator_tags_bak_20261028 b where b.id = o.id;

commit;
