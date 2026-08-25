-- 가족 카테고리 하위 주제 추가 (2026.08.26)
-- 기존 '가족'(일반) 태그 유지 + 아빠·엄마·형제자매·할머니·할아버지 추가.
-- 폼·필터는 operator_tags를 DB에서 카테고리별로 로드하므로 코드 변경 불필요.
-- UNIQUE(name) + NOT EXISTS 가드로 재실행 안전.
insert into operator_tags (name, tag_category, is_active, sort_order)
select v.name, '가족', true, v.ord
from (values
  ('아빠', 1),
  ('엄마', 2),
  ('형제자매', 3),
  ('할머니·할아버지', 4)
) as v(name, ord)
where not exists (select 1 from operator_tags o where o.name = v.name);
