-- =====================================================================
-- 신고·차단 (2026.11.03) — 애플 1.2 / 구글 Play 사용자 제작 콘텐츠 정책 대응
--  · reports: 이용자가 기록을 신고 → 운영자가 /moderation에서 확인·숨김
--  · user_blocks: 이용자가 다른 이용자를 차단 → 그 사람의 기록이 '나에게만' 안 보임
--  · delete_my_account(): 탈퇴 시 신고·차단 기록도 함께 삭제하도록 갱신
-- 실행: Supabase SQL Editor에서 전체 한 번 (팝업이 뜨면 'Run without RLS' — 아래에서 RLS를 직접 켬)
-- =====================================================================
begin;

-- 1) 신고
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.users (id) on delete cascade,
  reason      text not null check (reason in ('inappropriate', 'privacy', 'spam', 'copyright', 'other')),
  detail      text check (detail is null or char_length(detail) <= 200),
  status      text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  unique (post_id, reporter_id) -- 같은 사람이 같은 기록을 여러 번 신고하지 않게
);
create index if not exists idx_reports_status on public.reports (status, created_at desc);

alter table public.reports enable row level security;
drop policy if exists reports_insert_own on public.reports;
drop policy if exists reports_operator on public.reports;
-- 본인 이름으로만 신고 / 보기·처리는 운영자만 (신고자 목록은 일반 이용자에게 비공개)
create policy reports_insert_own on public.reports for insert
  with check (reporter_id = auth.uid());
create policy reports_operator on public.reports for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator));

-- 2) 차단
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
drop policy if exists user_blocks_own on public.user_blocks;
-- 차단 목록은 본인만 보고·추가·해제 (상대방은 차단 사실을 알 수 없음)
create policy user_blocks_own on public.user_blocks for all
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- 3) 탈퇴 함수 갱신 — 신고·차단 기록도 삭제 (supabase/add_delete_account.sql의 최신판)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.users where id = uid and is_operator) then
    raise exception 'operator account cannot be deleted';
  end if;

  -- 내 기록에 딸린 것 → 내 기록
  delete from public.reports       where post_id in (select id from public.posts where user_id = uid);
  delete from public.post_images   where post_id in (select id from public.posts where user_id = uid);
  delete from public.post_tags     where post_id in (select id from public.posts where user_id = uid);
  delete from public.post_groups   where post_id in (select id from public.posts where user_id = uid);
  delete from public.post_children where post_id in (select id from public.posts where user_id = uid);
  delete from public.comments      where post_id in (select id from public.posts where user_id = uid) or user_id = uid;
  delete from public.posts         where user_id = uid;

  -- 나머지 내 데이터
  delete from public.reports           where reporter_id = uid;
  delete from public.user_blocks       where blocker_id = uid or blocked_id = uid;
  delete from public.bookmarks         where user_id = uid;  -- 저장 수는 트리거가 자동으로 줄임
  delete from public.likes             where user_id = uid;
  delete from public.topic_suggestions where user_id = uid;
  delete from public.children          where user_id = uid;
  update public.operator_tags set created_by = null where created_by = uid;

  -- 계정
  delete from public.users where id = uid;
  delete from auth.users   where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
