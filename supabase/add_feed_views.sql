-- 홈 피드·그룹 더보기·sitemap용 집계 뷰 (2026.10, 성능 #2)
-- 목적: 매 요청마다 모든 posts를 앱 서버로 가져와 JS로 집계하던 구조를 DB 집계로 이전.
--
-- 설계 원칙(데이터가 크게 늘어도 오류가 나지 않게):
--   · 책 1권 단위로 계산(LATERAL/상관 서브쿼리) — 앱이 "book_id > 마지막 id, 1,000건"으로 나눠 요청하면
--     DB는 그 1,000권만 인덱스로 계산한다. 전체 데이터 크기와 무관하게 요청당 작업량이 일정 →
--     Supabase anon 문장 시간 제한(기본 3초)에 걸리지 않는다.
--   · 시기별 기록 수도 책별 jsonb로 내보내 앱에서 합산(전체 테이블을 한 번에 집계하는 쿼리 없음).
--   · security_invoker = true → 조회자의 RLS가 그대로 적용(뷰가 RLS를 우회하지 않음). PG15+.
--
-- 로직은 기존 JS 집계(src/lib/feed.ts 구버전)와 동일:
--   · 피드 노출 자격 = 반응(child_reaction) ≥ 2  ← src/lib/reactions.ts RECOMMENDED_REACTION_MIN과 일치시킬 것
--   · 대표 반응 = 자격 기록의 최빈값 / 글밥량 = 전체 기록의 최빈값 (둘 다 동률이면 큰 값)
--   · 주제 = 자격 기록의 운영자 태그 + 커스텀 태그(카테고리명·운영자 태그명과 겹치면 앱에서 제거).
--     순서 = 최근 기록에 처음 등장한 순, 같은 기록 안에서는 저장 순서(post_tags.seq)
--
-- ※ 재실행 안전: 기존 뷰를 지우고 다시 만든다(뷰는 데이터를 저장하지 않음 — 지워도 데이터 손실 없음).
--   Supabase SQL Editor에서 실행. 실행 후 앱 배포.

-- 책별 추천 수 집계용 인덱스 (likes PK는 (user_id, book_id)라 book_id 단독 조회에 못 씀)
create index if not exists idx_likes_book on public.likes (book_id);

-- 주제 태그 순서 확정용 순번. post_tags.id는 랜덤 UUID라 저장 순서를 알 수 없었고, 기존 카드의 태그 순서는
-- DB가 돌려주는 (보장되지 않는) 물리 저장 순서였다. identity 칼럼을 추가하면 기존 행은 현재 저장 순서대로,
-- 이후 저장분은 작성자가 고른 순서대로 번호가 붙는다 → 현재 화면 순서를 그대로 보존하면서 앞으로도 고정.
-- (앱의 저장 코드는 seq를 지정하지 않으므로 수정 불필요)
alter table public.post_tags add column if not exists seq bigint generated always as identity;

drop view if exists public.book_feed_cards;
drop view if exists public.feed_group_record_counts;  -- 이전 버전 정리(시기별 수는 book_feed_cards에 통합)
drop view if exists public.sitemap_books;

-- ---------- 1) 책 카드 (자격 기록이 1건 이상인 책만, 책 1행) ----------
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
  s.custom_topics,
  s.op_slugs
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
      order by pt.custom_tag, p.created_at desc, pt.seq) t), '{}')                      as custom_topics,
    -- 운영자 태그 slug(숨김 포함): 가장 최근 기록에 처음 등장한 순 — 주제·큰 분류 필터와 표시용(2026.10 주제 개편)
    coalesce((select array_agg(t.slug order by t.last_seen desc, t.first_seq) from (
      select distinct on (ot.slug) ot.slug, p.created_at as last_seen, pt.seq as first_seq
      from public.posts p
      join public.post_tags pt on pt.post_id = p.id
      join public.operator_tags ot on ot.id = pt.tag_id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and pt.is_operator_tag and ot.slug is not null
      order by ot.slug, p.created_at desc, pt.seq) t), '{}')                            as op_slugs
) s
where exists (  -- 피드 노출 자격 기록이 1건 이상인 책만
  select 1 from public.posts p
  where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
);

-- ---------- 2) sitemap용: 기록 있는 책별 최신 기록일 (책 1행, 책 단위 계산) ----------
create view public.sitemap_books
with (security_invoker = true) as
select
  b.book_key,
  (select max(p.created_at) from public.posts p
    where p.book_id = b.id and p.hidden_at is null) as last_modified
from public.books b
where b.book_key is not null
  and exists (select 1 from public.posts p where p.book_id = b.id and p.hidden_at is null);

grant select on public.book_feed_cards to anon, authenticated;
grant select on public.sitemap_books   to anon, authenticated;
