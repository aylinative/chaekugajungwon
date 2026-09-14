-- 주제 태그 이름 변경 (2026.09) — '감정·마음' → '인성·감정·마음' (나·마음·몸·습관)
-- name만 변경 → tag_id·기존 post_tags 연결 유지(데이터 안 깨짐). 명명 규칙: 슬래시→가운뎃점.
-- ※ 재실행 안전(idempotent). Supabase SQL Editor에서 1회 실행.

update operator_tags set name = '인성·감정·마음' where name = '감정·마음';
