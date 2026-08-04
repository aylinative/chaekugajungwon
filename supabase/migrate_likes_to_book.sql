-- '나도 추천해요'를 기록(post) 단위 → 책(book) 단위로 전환 (2026.08 확정, 17장 👍 의미 충돌 해소)
-- 이유: 추천은 "책·시기에 대한 판단"이므로 책 레벨이 정합. 기록 간 랭킹은 현재 미사용
--       (홈 피드=책 단위, 책 페이지=작성순). 기록 공감('도움돼요')은 출시 후 필요 시 별도 신설.
-- bookmarks 전환(migrate_bookmarks_to_book.sql)과 동일 패턴.

alter table likes
  add column if not exists book_id uuid references books(id) on delete cascade;

update likes l
   set book_id = p.book_id
  from posts p
 where l.post_id = p.id
   and l.book_id is null;

-- 같은 유저가 같은 책의 여러 기록에 추천한 경우: group_names 합집합으로 병합
with merged as (
  select l.user_id, l.book_id, array_agg(distinct g) as gn
    from likes l
    cross join lateral unnest(l.group_names) as g
   group by l.user_id, l.book_id
)
update likes l
   set group_names = m.gn
  from merged m
 where l.user_id = m.user_id
   and l.book_id = m.book_id;

-- 중복 행 제거 (병합 후 1행만 유지)
delete from likes a
 using likes b
 where a.user_id = b.user_id
   and a.book_id = b.book_id
   and a.ctid    > b.ctid;

delete from likes where book_id is null;

-- post_id 제거 (기존 PK (user_id, post_id)도 함께 드롭됨) → 새 PK
alter table likes drop column if exists post_id;
alter table likes alter column book_id set not null;
alter table likes add primary key (user_id, book_id);
