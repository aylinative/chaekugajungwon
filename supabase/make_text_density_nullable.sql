-- text_density를 nullable로 (2026.09)
-- 아카이빙 임포트 등 '글밥 정보 없는' 기록은 NULL 허용(정보 없음). 표시 코드는 null이면 글밥량 영역 숨김.
-- 신규 폼 입력은 여전히 클라이언트에서 필수 선택 → 앱 경로에는 영향 없음.
-- CHECK(0~5)는 NULL을 통과시키므로 그대로 둔다.
alter table public.posts alter column text_density drop not null;
