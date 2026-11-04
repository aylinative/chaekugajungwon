-- 로그인 수단 추가 (구글·Apple, 2026.11 — 앱 스토어 STEP I3)
-- kakao_id: 카카오 가입자만 값이 있다(구글·Apple 가입자는 NULL). 다른 서비스의 식별값을 넣지 말 것 —
--           탈퇴 API가 이 번호로 카카오 연결을 끊는다.
-- auth_provider: 처음 가입한 로그인 수단. 기존 회원은 전부 카카오.
--   ⚠️ supabase/hide_kakao_id.sql의 grant select 목록에 일부러 넣지 않았다(외부 공개 불필요).
--      앱은 로그인 정보(user.app_metadata)로 판단하고, 수단별 가입자 수는 SQL Editor에서 본다:
--      select auth_provider, count(*) from public.users group by 1;
-- ⚠️ 이 코드를 배포하기 전에 먼저 실행할 것(새 가입 처리가 이 열을 쓴다).
-- 되돌리기: alter table public.users drop column auth_provider;
--           (구글·Apple 가입자가 생긴 뒤에는 kakao_id NOT NULL을 되돌릴 수 없음)

alter table public.users alter column kakao_id drop not null;

alter table public.users
  add column if not exists auth_provider text not null default 'kakao'
  check (auth_provider in ('kakao', 'google', 'apple'));
