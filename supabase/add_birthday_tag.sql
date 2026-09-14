-- 주제 태그 추가 (2026.09) — 놀이·말 카테고리에 '생일' 신규 + 관련 그림책 2권 연결
-- ※ 폼·필터는 operator_tags를 DB에서 카테고리별로 로드하므로 코드 변경 불필요.
-- ※ 재실행 안전(idempotent). Supabase SQL Editor에서 1회 실행.

insert into operator_tags (name, tag_category, is_active, sort_order)
select '생일', '놀이·말', true, 3
where not exists (select 1 from operator_tags where name = '생일');

-- 바닷속 생일 파티(9791195641345), 부릉부릉 누구 생일?(9791160949872)에 '생일' 연결
insert into post_tags (post_id, tag_id, is_operator_tag)
select p.id, ot.id, true
from posts p
join books b on b.id = p.book_id
cross join (select id from operator_tags where name = '생일') ot
where b.book_key in ('9791195641345', '9791160949872')
  and not exists (
    select 1 from post_tags pt where pt.post_id = p.id and pt.tag_id = ot.id
  );
