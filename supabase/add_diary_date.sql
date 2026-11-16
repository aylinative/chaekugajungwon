-- 책육아 일기 날짜 (2026.11.17)
-- posts.diary_date = 이 기록(일기)의 날짜. 기본은 기록한 날(KST), 작성자가 바꿀 수 있음(미래 불가 — API에서 확인).
-- 마이 캘린더·책 페이지/상세의 표시 날짜는 이 값. 홈 '최근 3일 새 기록' 정렬은 그대로 created_at.
-- 아이 나이는 저장하지 않는다 — 볼 때 아이 생일 + 이 날짜로 계산, 작성자 본인에게만 표시(CLAUDE.md 10.1·18.1).

begin;

alter table public.posts add column if not exists diary_date date;

-- 기존 기록은 기록한 날(KST)로 채움
update public.posts
   set diary_date = (created_at at time zone 'Asia/Seoul')::date
 where diary_date is null;

alter table public.posts
  alter column diary_date set default ((now() at time zone 'Asia/Seoul')::date),
  alter column diary_date set not null;

commit;

-- 되돌리기: alter table public.posts drop column if exists diary_date;
