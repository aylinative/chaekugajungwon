-- 주제 태그 소소 정리 (2026.08.31)
--  1) '가족' 카테고리의 중복 '가족' 태그 비활성 (카테고리명과 동일 → 폼에서 중복 노출)
--  2) '친척' 신규 (이모·삼촌·고모 등 기타 친척) — 가족 카테고리
--  3) '기관' → '기관/학교' 개명 (name만 변경 → tag_id·기존 post_tags 유지)
-- ※ 재실행 안전(idempotent). Supabase SQL Editor에서 1회 실행.

-- 1) 중복 '가족' 태그 비활성 (삭제 대신 is_active=false로 히스토리 보존)
update operator_tags set is_active = false where name = '가족' and tag_category = '가족';

-- 2) '친척' 신규 (없을 때만)
insert into operator_tags (name, tag_category, is_active, sort_order)
select '친척', '가족', true, 90
where not exists (select 1 from operator_tags where name = '친척');

-- 3) '기관' → '기관/학교'
update operator_tags set name = '기관/학교' where name = '기관';
