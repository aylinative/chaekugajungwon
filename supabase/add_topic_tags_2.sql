-- 주제 태그 추가·이동 (2026.09)
--  · 놀이·말: '형태가재밌는북', '몸놀이' 신규
--  · 자연·생물: '바다', '과일' 신규
--  · '명절·기념일' 놀이·말 → 사물·개념 이동
-- ※ 재실행 안전(idempotent). Supabase SQL Editor에서 1회 실행.

-- 놀이·말 신규
insert into operator_tags (name, tag_category, is_active, sort_order)
select v.name, '놀이·말', true, v.ord
from (values ('형태가재밌는북', 80), ('몸놀이', 81)) as v(name, ord)
where not exists (select 1 from operator_tags o where o.name = v.name);

-- 자연·생물 신규
insert into operator_tags (name, tag_category, is_active, sort_order)
select v.name, '자연·생물', true, v.ord
from (values ('바다', 80), ('과일', 81)) as v(name, ord)
where not exists (select 1 from operator_tags o where o.name = v.name);

-- 명절·기념일 카테고리 이동 (놀이·말 → 사물·개념)
update operator_tags set tag_category = '사물·개념' where name = '명절·기념일';
