-- 주제 태그 개편 v2 — 실행 후 확인 (읽기만)
-- ① 활성 주제·세부 수 (기대: topic 56, detail 43)
select level, is_active, count(*) from public.operator_tags group by 1, 2 order by 1, 2;
-- ② 큰 분류별 활성 주제·세부 수
select tag_category, count(*) filter (where level = 'topic') as 주제, count(*) filter (where level = 'detail') as 세부
  from public.operator_tags where is_active group by 1 order by 1;
-- ③ 숨김 보존 태그와 연결된 기록 수 (기대: 인성·감정·마음 22, 몸·건강 13, 동물 19, 명절·기념일·전통 4, 말놀이·수놀이 13, 숨은그림찾기 2, 친척 0)
select o.name, o.tag_category, count(pt.*) from public.operator_tags o left join public.post_tags pt on pt.tag_id = o.id
 where not o.is_active group by 1, 2 order by 3 desc;
-- ④ 연결 출처별 건수 (기대: legacy = 실행 전 234 − 떼어낸 3, reclassify = 새로 붙은 수)
select source, count(*) from public.post_tags group by 1;
-- ⑤ 이름이 바뀌어 이어진 태그의 연결 수 (예: 토이북 10−1, 생활습관 › 잠 12, 캐릭터 3−2, 바다·산·숲 › 바다 3)
select o.tag_category, o.name, o.level, count(pt.*) from public.operator_tags o join public.post_tags pt on pt.tag_id = o.id
 where o.is_active group by 1, 2, 3 order by 1, 4 desc;
-- ⑥ 세부의 상위 주제 확인
select p.name as 주제, d.name as 세부 from public.operator_tags d join public.operator_tags p on p.id = d.parent_id order by p.sort_order, d.sort_order;
