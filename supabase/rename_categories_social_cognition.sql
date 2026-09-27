-- 주제 태그 대표 카테고리 이름 변경 (2026.09.28)
--   '친구·사회' → '사회·관계'
--   '사물·개념' → '사물·인지'
-- 카테고리는 별도 테이블이 아니라 operator_tags.tag_category(자유 텍스트)에 저장 →
--   해당 값을 가진 모든 태그 행의 tag_category를 갱신한다. tag_id·post_tags 연결은 그대로 유지.
-- 코드 상수도 함께 변경(lib/tagCategories.ts TAG_CATEGORIES, lib/tags.ts TOPIC_CATEGORY_ORDER).
-- ※ 재실행 안전(idempotent). Supabase SQL Editor에서 1회 실행.

update operator_tags set tag_category = '사회·관계' where tag_category = '친구·사회';
update operator_tags set tag_category = '사물·인지' where tag_category = '사물·개념';
