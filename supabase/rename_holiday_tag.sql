-- 주제 태그 이름 변경 (2026.09) — '명절·기념일' → '명절·기념일·전통' (사물·개념)
-- name만 변경 → tag_id·기존 post_tags 연결 유지. 명명 규칙: 슬래시→가운뎃점.
-- ※ 재실행 안전(idempotent). Supabase SQL Editor에서 1회 실행.

update operator_tags set name = '명절·기념일·전통' where name = '명절·기념일';
