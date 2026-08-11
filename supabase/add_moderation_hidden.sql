-- 모더레이션(숨김) — 소프트 삭제 (2026.08)
-- posts·comments에 hidden_at 추가. 숨김 = hidden_at 세팅(복구 가능), 조회는 hidden_at is null만.
-- 작성자 본인 또는 운영자(users.is_operator)가 숨길 수 있다.

alter table posts add column if not exists hidden_at timestamptz;
alter table comments add column if not exists hidden_at timestamptz;

-- ===== RLS: 운영자 예외 추가 (기존 '본인만' 정책은 유지) =====

-- posts: 본인 update(기존) + 운영자도 update(숨김 처리용)
drop policy if exists posts_update_operator on public.posts;
create policy posts_update_operator on public.posts for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator));

-- comments: 본인 delete(기존) + 운영자 update(숨김)
--   댓글은 하드 delete 대신 숨김으로 통일하려면 update도 필요.
drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists comments_update_operator on public.comments;
create policy comments_update_operator on public.comments for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator));
