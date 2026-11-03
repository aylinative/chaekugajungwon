-- 카카오 회원번호(users.kakao_id) 외부 조회 차단 (2026.11.03)
-- 문제: users는 닉네임 표시용으로 '누구나 읽기'(RLS users_select_all)라, 같은 표의 kakao_id까지
--       로그인 없이 REST로 조회됐다(개인정보). → 열 단위 권한으로 kakao_id만 읽기 금지.
-- 방식: 표 전체 SELECT 권한을 거두고, kakao_id를 뺀 열만 다시 허용.
--   ⚠️ users에 새 열을 추가하면 아래 grant select 목록에도 넣어야 앱에서 읽힌다(안 넣으면 permission denied).
-- 쓰기(insert/upsert/update)는 그대로 — 콜백·프로필·기록 API의 kakao_id 저장은 계속 동작.
-- 탈퇴 API는 본인 kakao_id를 아래 my_kakao_id() 함수로 읽는다(본인 것만).
-- 되돌리기: grant select on public.users to anon, authenticated;

revoke select on public.users from anon, authenticated;
grant select (id, nickname, is_operator, created_at, onboarded_at) on public.users to anon, authenticated;

create or replace function public.my_kakao_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select kakao_id from public.users where id = auth.uid()
$$;

revoke all on function public.my_kakao_id() from public, anon;
grant execute on function public.my_kakao_id() to authenticated;

-- 확인: 아래가 '권한 없음' 오류면 성공 (SQL Editor는 관리자라 보이므로, 확인은 Claude가 외부 조회로 함)
-- select kakao_id from public.users limit 1;
