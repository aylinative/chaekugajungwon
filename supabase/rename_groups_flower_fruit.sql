-- 시기 명칭 변경: 봄꽃 → 꽃잎, 사과 → 열매 (2026.08 확정)
-- 성장 서사(씨앗→새싹→꽃잎→열매→나무)와 정합.
-- CHECK 제약이 라벨을 고정하므로 "제약 해제 → 데이터 치환 → 제약 재생성" 순서로 실행.
-- 코드 값(value: springflower/apple)과 컬러 토큰은 그대로 유지 — 화면 라벨만 변경.

-- ---------- post_groups ----------
alter table post_groups drop constraint if exists post_groups_group_name_check;

update post_groups set group_name = '꽃잎' where group_name = '봄꽃';
update post_groups set group_name = '열매' where group_name = '사과';

alter table post_groups add constraint post_groups_group_name_check
  check (group_name in ('씨앗','새싹','꽃잎','열매','나무','어른'));

-- ---------- likes.group_names ----------
alter table likes drop constraint if exists chk_likes_groups;

update likes set group_names = array_replace(group_names, '봄꽃', '꽃잎')
 where '봄꽃' = any(group_names);
update likes set group_names = array_replace(group_names, '사과', '열매')
 where '사과' = any(group_names);

alter table likes add constraint chk_likes_groups
  check (group_names <@ ARRAY['씨앗','새싹','꽃잎','열매','나무','어른']::text[]);
