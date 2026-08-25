-- 알라딘 Open API 종료·카카오 전환에 따른 컬럼 리네임 (2026.08.26)
--   books.aladin_item_id → book_key   (책 식별 키, 보통 ISBN13·없으면 링크/제목 대체)
--   books.aladin_url     → source_url (외부 책 상세 링크)
-- ※ RENAME COLUMN은 메타데이터 연산(즉시). 데이터·UNIQUE 제약·인덱스 자동 승계.
-- ※ 배포 전(실사용자 0) 실행. Supabase SQL Editor에서 1회 실행.
-- ※ idempotent — 이미 리네임된 DB(신규 셋업)에서 다시 돌려도 안전.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'books' and column_name = 'aladin_item_id'
  ) then
    alter table public.books rename column aladin_item_id to book_key;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'books' and column_name = 'aladin_url'
  ) then
    alter table public.books rename column aladin_url to source_url;
  end if;
end $$;

-- UNIQUE 제약의 자동 인덱스명도 정리(선택적 청소, 있으면만).
alter index if exists public.books_aladin_item_id_key rename to books_book_key_key;

-- search_books 함수: RETURNS TABLE의 출력 컬럼명이 바뀌므로 create-or-replace가 아닌 drop 후 재생성.
drop function if exists search_books(text);

create function search_books(search_query text)
returns table (
  id uuid,
  book_key varchar,
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
    select replace(replace(replace(lower(trim(search_query)), '\', '\\'), '%', '\%'), '_', '\_') as esc,
           lower(trim(search_query)) as raw
  )
  select b.id, b.book_key, b.title, b.author, b.cover_image_url,
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
