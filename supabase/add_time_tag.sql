-- 주제 태그 추가 (2026.09) — 사물·개념 카테고리에 '시간' 신규
-- ※ 폼·필터는 operator_tags를 DB에서 카테고리별로 로드하므로 코드 변경 불필요.
-- ※ 재실행 안전(idempotent). Supabase SQL Editor에서 1회 실행.

insert into operator_tags (name, tag_category, is_active, sort_order)
select '시간', '사물·개념', true, 4
where not exists (select 1 from operator_tags where name = '시간');
