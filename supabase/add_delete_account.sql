-- =====================================================================
-- 회원 탈퇴: 본인 계정과 모든 데이터 삭제 (2026.11.03, A안 = 전부 삭제)
-- 앱에서 supabase.rpc('delete_my_account')로 호출. 로그인한 본인(auth.uid())만 지울 수 있다.
-- - security definer: auth.users(로그인 계정) 삭제는 일반 권한으로 못 해서 함수 소유자 권한으로 실행
-- - 외래키 cascade에만 기대지 않고 순서대로 명시 삭제 (schema.sql과 라이브 DB의 FK가 다른 곳이 있어서 — CLAUDE.md [스키마])
-- - 운영자 계정은 실수 방지를 위해 탈퇴 불가 (권한을 콘솔에서 먼저 해제해야 함)
-- - 사진 파일(Storage)은 SQL로 지우면 실제 파일이 남으므로 API(/api/account/delete)가 먼저 지운다
-- ⚠️ 최신판은 supabase/add_reports_blocks.sql(신고·차단 삭제 포함, 2026.11.03). 이 파일은 첫 버전 기록용.
-- 실행: Supabase SQL Editor에서 한 번 (팝업이 뜨면 'Run without RLS' — 새 테이블 없음)
-- =====================================================================
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
  delete from public.post_images   where post_id in (select id from public.posts where user_id = uid);
  delete from public.post_tags     where post_id in (select id from public.posts where user_id = uid);
  delete from public.post_groups   where post_id in (select id from public.posts where user_id = uid);
  delete from public.post_children where post_id in (select id from public.posts where user_id = uid);
  delete from public.comments      where post_id in (select id from public.posts where user_id = uid) or user_id = uid;
  delete from public.posts         where user_id = uid;

  -- 나머지 내 데이터
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
