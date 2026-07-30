-- posts에 '우리 아이 반응' 컬럼 추가 (재독 여부를 흡수한 3단계)
--   3 = 자꾸 꺼내봐요, 2 = 재밌어했어요, 1 = 그냥 봤어요
-- 홈 피드(커뮤니티 추천)에는 2 이상만 노출된다.
-- Supabase SQL Editor에서 실행.

alter table public.posts
  add column if not exists child_reaction smallint not null default 2;

-- 값 범위 제약 (이미 있으면 무시)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_child_reaction_check'
  ) then
    alter table public.posts
      add constraint posts_child_reaction_check check (child_reaction between 1 and 3);
  end if;
end $$;

-- 기존 데이터 보정: 재독('계속 꺼내봐요')이던 기록은 '자꾸 꺼내봐요'(3)로
update public.posts set child_reaction = 3 where reread = true;
