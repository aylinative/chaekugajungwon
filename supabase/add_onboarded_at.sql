-- 온보딩 노출을 계정 단위로 판단하기 위한 플래그 (2026.09)
-- 기존엔 localStorage(기기·브라우저별)로만 판단해, 기존 유저가 새 기기(예: 아이패드)로 접속하면
-- 신규 유저용 온보딩이 다시 떴다. onboarded_at이 있으면 기기와 무관하게 계정당 1회만 노출한다.
-- NULL = 아직 온보딩 안 봄 → 노출 대상. 값이 있으면 이미 봄 → 노출 안 함.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
