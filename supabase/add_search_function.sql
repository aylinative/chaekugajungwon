-- 책 제목+작가 유사 검색 함수 (2026.08, 작가 검색 추가)
-- 1) 띄어쓰기 무시 부분 일치: '달님안녕' ↔ '달님 안녕' (제목·작가 모두)
-- 2) pg_trgm 유사도: 가벼운 오타·변형도 매칭 (기본 임계값 0.3)
-- 기록이 있는 책만 반환, 기록 수 → 추천 수 순 정렬.

create extension if not exists pg_trgm;

create or replace function search_books(search_query text)
returns table (
  id uuid,
  aladin_item_id varchar,
  title varchar,
  author varchar,
  cover_image_url text,
  record_count bigint,
  recommend_count bigint
)
language sql
stable
as $$
  with q as (
    -- 사용자 입력의 like 특수문자 이스케이프 + 공백 제거 소문자화
    select replace(replace(replace(lower(trim(search_query)), '\', '\\'), '%', '\%'), '_', '\_') as esc,
           lower(trim(search_query)) as raw
  )
  select b.id, b.aladin_item_id, b.title, b.author, b.cover_image_url,
         (select count(*) from posts p where p.book_id = b.id and p.hidden_at is null) as record_count,
         (select count(*) from likes l where l.book_id = b.id) as recommend_count
    from books b, q
   where (
           replace(lower(b.title), ' ', '') like '%' || replace(q.esc, ' ', '') || '%' escape '\'
           or b.title % q.raw
           or replace(lower(coalesce(b.author, '')), ' ', '') like '%' || replace(q.esc, ' ', '') || '%' escape '\'
           or coalesce(b.author, '') % q.raw
         )
     and exists (select 1 from posts p where p.book_id = b.id and p.hidden_at is null)
   order by record_count desc, recommend_count desc
   limit 30
$$;
