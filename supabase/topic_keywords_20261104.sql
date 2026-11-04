-- 주제 추천 매칭어 보강 (2026.11.04 운영자) — 제목에서 주제를 못 찾던 책 69권 점검 결과
-- 한 글자 매칭어(꽃·밤·비·눈·빵)는 '제목에서만 + 단어 단위'로 동작 (lib/topicMatch.ts, 같은 날 코드 반영)
-- '^말' = 제목에서만 매칭 ('마음'·'그릇'은 책 소개에 너무 흔해서 제목만)
-- 이미 있는 단어는 건너뛰므로 여러 번 실행해도 안전.
-- ⚠️ 실행 후 /admin/tags 에서 아무 태그나 한 번 저장해야 기록하기 화면의 주제 목록(하루 캐시)이 바로 갱신된다.

-- 0) 'ㅣ'(한글 모음)로 잘못 이어 쓴 단어 나누기 — 예: 과일 '복숭아ㅣ수박ㅣ메론ㅣ참외ㅣ블루베리ㅣ체리'가 한 단어로 저장돼 복숭아도 안 잡히던 문제
update public.operator_tags t
   set intro_keywords = array(
         select trim(x) from unnest(t.intro_keywords) with ordinality u(e, o),
                regexp_split_to_table(e, 'ㅣ') with ordinality s(x, o2)
          where trim(x) <> '' order by o, o2)
 where exists (select 1 from unnest(t.intro_keywords) e where e like '%ㅣ%');
update public.operator_tags t
   set intro_excludes = array(
         select trim(x) from unnest(t.intro_excludes) with ordinality u(e, o),
                regexp_split_to_table(e, 'ㅣ') with ordinality s(x, o2)
          where trim(x) <> '' order by o, o2)
 where exists (select 1 from unnest(t.intro_excludes) e where e like '%ㅣ%');
update public.operator_tags t
   set search_aliases = array(
         select trim(x) from unnest(t.search_aliases) with ordinality u(e, o),
                regexp_split_to_table(e, 'ㅣ') with ordinality s(x, o2)
          where trim(x) <> '' order by o, o2)
 where exists (select 1 from unnest(t.search_aliases) e where e like '%ㅣ%');

create or replace function pg_temp.add_kw(tag_name text, kws text[], excl text[] default '{}')
returns void language sql as $$
  update public.operator_tags
     set intro_keywords = coalesce(intro_keywords, '{}')
           || array(select k from unnest(kws) k where not k = any(coalesce(intro_keywords, '{}'))),
         intro_excludes = coalesce(intro_excludes, '{}')
           || array(select e from unnest(excl) e where not e = any(coalesce(intro_excludes, '{}')))
   where name = tag_name and is_active;
$$;

select pg_temp.add_kw('과일', array['수박', '메론', '멜론', '참외', '체리', '블루베리']);
select pg_temp.add_kw('친구', array['싸우'], array['동물 친구', '안녕, 내 친구']);
select pg_temp.add_kw('식물', array['꽃', '나뭇잎', '가랑잎'], array['꽃가마']);
select pg_temp.add_kw('가을', array['나뭇잎', '가랑잎']);
select pg_temp.add_kw('잠', array['밤']);
select pg_temp.add_kw('날씨 : 비·눈·바람', array['비', '눈'], array['눈 코 입']);
select pg_temp.add_kw('빵·간식', array['빵']);
select pg_temp.add_kw('내 몸', array['눈 코 입']);
select pg_temp.add_kw('말놀이·말배우기', array['눈 코 입']);
select pg_temp.add_kw('강아지', array['댕댕이', '짖어']);
select pg_temp.add_kw('바다 동물', array['거북']);
select pg_temp.add_kw('마법·신기한 일', array['마술']);
select pg_temp.add_kw('배변', array['변비']);
select pg_temp.add_kw('아플 때·병원', array['따끔']);
select pg_temp.add_kw('밥 먹기', array['반찬', '^그릇']);
select pg_temp.add_kw('여름', array['풍덩', '시원해']);
select pg_temp.add_kw('숫자·세기', array['123']);
select pg_temp.add_kw('탈것', array['부릉']);
select pg_temp.add_kw('여러 가지 감정', array['^마음']);
select pg_temp.add_kw('모양·크기', array['구멍']);
-- 배(탈것): 이름 '배'가 제목에서 잡히므로 '배가 아파' 같은 몸 이야기는 제외
select pg_temp.add_kw('배', array[]::text[], array['배가 아', '배 아파']);
-- 해·달: 한 글자 이름이 제목에서 잡히므로 동사('해 보자', '말 안 해')·달(月) 표현은 제외
select pg_temp.add_kw('해', array[]::text[], array['해 보', '해 봐', '해 줘', '해 주', '안 해', '못 해', '잘 해', '다 해']);
select pg_temp.add_kw('달', array[]::text[], array['열두 달', '한 달', '두 달']);

-- 확인: 23줄이 나와야 함 (과일은 복숭아·수박 등이 따로 나뉘어 있어야 함)
select name, intro_keywords, intro_excludes from public.operator_tags
 where is_active and name in ('과일','친구','식물','가을','잠','날씨 : 비·눈·바람','빵·간식','내 몸','말놀이·말배우기','강아지',
   '바다 동물','마법·신기한 일','배변','아플 때·병원','밥 먹기','여름','숫자·세기','탈것','여러 가지 감정','모양·크기','배','해','달')
 order by name;
