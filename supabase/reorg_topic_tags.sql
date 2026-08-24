-- 주제 태그 MECE 재정리 (CLAUDE.md 8.1, 확정 v4 2026.08.24)
-- 시선의 방향(나→가족→친구·사회→세상) 6 대표 카테고리 + 하위 태그.
-- 형태 축(보드북/조작북/병풍팝업/양장본) 폐지 → books.is_board_book(책 속성)로.
-- 태그 rename은 name만 변경(tag_id 유지 → 기존 post_tags 안 깨짐). 신규는 insert. 형태는 비활성.

-- 0) 스키마 보강
-- tag_category CHECK(주제/형태만 허용) 제거 — 6개 대표 카테고리로 확장되므로 자유 텍스트화
alter table operator_tags drop constraint if exists operator_tags_tag_category_check;
alter table operator_tags add column if not exists sort_order int not null default 0;
alter table books add column if not exists is_board_book boolean not null default false;

-- 1) 이름 정리 (슬래시→가운뎃점, 표현 정리). tag_id·연결 유지.
update operator_tags set name = '감정·마음'      where name = '인성/감정/회복탄력성';
update operator_tags set name = '몸·건강'        where name = '몸/신체';
update operator_tags set name = '기관'           where name = '어린이집/유치원/학교';
update operator_tags set name = '말놀이·수놀이'  where name = '말놀이/수놀이';
update operator_tags set name = '똥·방귀'        where name = '똥/방귀';
update operator_tags set name = '명절·기념일'    where name = '명절/기념일';

-- 2) 신규 태그 (구 '인성/감정/회복탄력성'을 SEL 축으로 분할한 나머지 + 나다움)
--    이미 있으면(재실행) 건너뜀
insert into operator_tags (name, tag_category, is_active, sort_order)
select v.name, v.cat, true, v.ord
from (values
  ('나다움',    '나·마음·몸·습관', 0),
  ('회복탄력성', '나·마음·몸·습관', 2),
  ('배려·협력',  '친구·사회',        1)
) as v(name, cat, ord)
where not exists (select 1 from operator_tags o where o.name = v.name);

-- 3) 카테고리(tag_category) + 정렬(sort_order) 일괄 설정 — 최종 이름 기준
update operator_tags set tag_category = c.cat, sort_order = c.ord
from (values
  -- 1) 나·마음·몸·습관
  ('나다움',        '나·마음·몸·습관', 0),
  ('감정·마음',      '나·마음·몸·습관', 1),
  ('회복탄력성',     '나·마음·몸·습관', 2),
  ('생활습관',       '나·마음·몸·습관', 3),
  ('잠자리독서',     '나·마음·몸·습관', 4),
  ('몸·건강',        '나·마음·몸·습관', 5),
  -- 2) 가족
  ('가족',          '가족',            0),
  -- 3) 친구·사회
  ('친구',          '친구·사회',        0),
  ('배려·협력',      '친구·사회',        1),
  ('다양성',         '친구·사회',        2),
  ('기관',          '친구·사회',        3),
  -- 4) 자연·생물
  ('동물',          '자연·생물',        0),
  ('공룡',          '자연·생물',        1),
  ('곤충',          '자연·생물',        2),
  ('식물',          '자연·생물',        3),
  ('계절',          '자연·생물',        4),
  -- 5) 사물·개념
  ('탈것',          '사물·개념',        0),
  ('음식',          '사물·개념',        1),
  ('색깔',          '사물·개념',        2),
  -- 6) 놀이·말
  ('말놀이·수놀이',  '놀이·말',          0),
  ('똥·방귀',        '놀이·말',          1),
  ('캐릭터',         '놀이·말',          2),
  ('명절·기념일',    '놀이·말',          3)
) as c(name, cat, ord)
where operator_tags.name = c.name;

-- 4) 형태 축 폐지 — 보드북 여부는 books.is_board_book로.
--    (a) 기존 '보드북' 태그가 붙은 책은 is_board_book = true 로 이관
update books set is_board_book = true
where id in (
  select p.book_id from posts p
  join post_tags pt on pt.post_id = p.id
  join operator_tags ot on ot.id = pt.tag_id
  where ot.name = '보드북'
);
--    (b) 형태 태그 연결(post_tags) 제거 — 이제 주제가 아니므로
delete from post_tags
where tag_id in (
  select id from operator_tags where name in ('보드북','조작북','병풍/팝업책','양장본')
);
--    (c) 형태 태그 비활성화 (히스토리 보존 위해 삭제 대신 is_active=false)
update operator_tags set is_active = false
where name in ('보드북','조작북','병풍/팝업책','양장본');
