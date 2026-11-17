# 작업 기록 — service-record

CLAUDE.md에 넣을 내용을 여기에 적는다. 형식·규칙: docs/WORKTREE_RULES.md 4번.
master에 합칠 때 CLAUDE.md로 옮기고, 옮긴 항목에는 (반영됨 커밋번호)를 붙인다.

## 2026.11.17 — 아이와 읽고 싶은 책: 기록 없는 책도 담기
→ CLAUDE.md 11.3절('아이와 읽고 싶은 책' 설명 아래)에 추가:
  ※ 기록 없는 책도 담기(2026.11.17): 제목 줄 오른쪽 (+) → '읽고 싶은 책 담기' 시트(화면 높이 92% 바텀시트,
    components/mypage/WishAddSheet.tsx). 기록하기와 같은 책 검색(0.3초 자동 검색·한 글자 제목·바코드 카메라).
    결과마다 [담기] → 담음 ✓ / 이미 기록한 책은 '읽은 책'(담기 불가). 여러 권 연달아 담기, 닫으면 책장 새로 불러옴.
    바코드는 자동으로 담지 않고 결과를 보여 확인 후 담기(잘못 읽힘 대비).
  API POST /api/bookmarks {book}: 책 찾기/만들기(lib/bookUpsert.ts findOrCreateBook — book_key=ISBN13→링크→제목,
    기록 저장과 같은 규칙, UNIQUE 충돌 시 재조회) → 이미 기록(숨김 제외)이면 409 → bookmarks upsert.
    누가 나중에 그 책을 기록하면 같은 books 행에 붙어 내 목록 → 책 페이지에서 기록이 보인다. 기록하면 자동으로 목록에서 빠짐(기존).
  기록 0건 책은 홈 피드·sitemap·검색 '기록 있는 책'에 나오지 않는다(셋 다 posts 존재 조건). 책 페이지는 열림.
→ CLAUDE.md 12장 '검색' ② 항목에 추가:
  '아직 기록이 없는 책' 카드에 [🔖 담기](같은 API). 비로그인은 로그인 시트('bookmark').

## 2026.11.17 — 책 정보 검색처 예스24 전환 준비 (전환일 스위치, 아직 꺼짐)
→ CLAUDE.md 13.1절을 '책 검색 API — 카카오 → 예스24 전환(2026.11)'으로 갱신, 아래 추가:
  ■ 스위치: 환경변수 YES24_START_AT(예: 2026-11-25T00:00:00+09:00) + YES24_API_KEY (lib/bookSource.ts).
    값이 없거나 그 전이면 카카오(지금과 같음). 그 시각부터 새 검색은 예스24, 실패(응답 없음 3초·5xx·429·SEARCH_002)면
    그 요청은 카카오로 대신하고 이 서버 인스턴스는 5분(한도 초과는 30초) 예스24를 건너뜀. 점검 때도 검색은 끊기지 않음.
  ■ 예스24 API: X-Api-Key 헤더, 검색 /v1/goods/itemList(category=ALL·pageSize=30·detail=Y 한 번 — 유아 등 세부 분류는 검색에서 불가),
    ISBN13은 /v1/goods/itemDetail. 걸러냄: ISBN 없음·성인·eBook/음반(goodsType 도서·외서만). 출간일 '20220730'→'2022-07-30',
    소개(contentDetail.bookIntroduction) HTML 제거. 판형 itemFormat='보드북' 또는 제목에 '보드북' → isBoardBook.
    한도: Basic 일 20,000·초당 10 / 제휴 일 100,000·초당 20 (2026.11 실측 사용량 하루 1,000 미만 추정).
  ■ 응답 items[]에 description·isBoardBook·source('yes24'|'kakao') 추가 — 기존 필드 그대로.
  ■ 기록하기: 고른 책이 isBoardBook이면 보드북 체크를 미리 켬(끄기 가능, 판형 누락이 많아 체크박스는 유지 — 실측 보드북 8권 중 3권만 '보드북').
    book_description을 기록 저장·수정 API로 넘겨 books.description에 저장(칸이 없으면 빼고 저장 — lib/bookUpsert).
  ■ 옛 카카오 책 → 예스24: 누가 그 책을 예스24 검색 결과로 다시 고르면(기록·수정·읽고 싶은 책 담기) 표지·링크·소개·절판을 예스24 것으로
    교체(제목·저자는 유지). lib/bookUpsert upgradeBookToYes24. 나머지는 data 탭 순차 보정(아래 요청).
  ■ 화면: 책 페이지·기록 상세 책 정보 카드에 '책 소개 2줄 + 더보기'(그 자리에서 펼침, 500자 넘으면 '예스24에서 전체 보기'),
    예스24 책이면 소개 아래 오른쪽 '도서 DB 제공: 예스24'(구분선 위 — 아래 추천·저장·공유와 분리). components/book/BookIntro.tsx.
    출처 판단 = 저장된 source_url이 yes24.com(lib/bookSource isYes24Book). '책 정보 보기'는 source_url 그대로(예스24 상품 페이지).
    소개는 원문 그대로 자르기만(요약 금지 — 예스24 약관 '왜곡 가공 금지').
  ■ 약관·개인정보처리방침: 같은 YES24_START_AT 기준. 그 전엔 지금 문구 + 상단 '변경 예정' 안내, 그 뒤엔 새 문구·시행일=전환일
    (/terms 서비스 내용·서비스의 변경과 중단·책임의 한계, /privacy 처리 위탁 표에 ㈜예스이십사). 1시간마다 다시 생성(revalidate 3600).
    홈 상단 공지 띠(components/BookSourceNotice, 공지 기간에만, 닫으면 이 기기에서 안 보임). ⚠️ 시행 7일 전에 YES24_START_AT을 넣어 배포할 것.
  ■ 예스24 약관 준수: 출처 표기·상품 링크, 키는 서버 전용, 자체 DB 구축 금지(기록·담기된 책만 저장), 변동 정보(절판 등) 갱신 — 아래 data 요청.

## [요청→data] 2026.11.17 — 예스24 전환 관련 2건
1) books.description 칸 추가 (text, NULL 허용). 책 소개 저장용(최대 2,000자로 잘라 저장).
   코드는 칸이 없어도 동작함(저장 시 PGRST204면 빼고 저장, 화면은 select '*'). 칸이 생기면 그때부터 저장·표시.
   ⚠️ users가 아니라 books라 hide_kakao_id.sql grant 목록과 무관. RLS는 기존 books 정책 그대로.
2) 옛 카카오 책 순차 보정 — YES24_START_AT 이후 실행. 대상: source_url이 yes24.com이 아니고 book_key가 ISBN13(13자리 숫자)인 books.
   예스24 GET https://apis.yes24.com/v1/goods/itemDetail?searchType=ISBN13&query={isbn}&detail=Y (헤더 X-Api-Key)
   → cover_image_url=cover, source_url=link, description=bookIntroduction(HTML 제거), is_out_of_print=/절판|품절/.test(itemStatus),
     itemFormat='보드북'이면 is_board_book=true(이미 true면 그대로, false로 바꾸지 않음). 제목·저자는 바꾸지 않음.
   속도: 1초에 1건 이하(초당 한도 10, 사용자 검색과 나눠 씀), 하루 수백 건 이내. GOODS_002(없음)은 건너뜀. 2026.11 기준 약 250권.
   이후 절판·품절은 주기적으로(예: 월 1회) 같은 방식으로 갱신 — 예스24 약관 '변동 정보 최신 유지'.

## [운영] 2026.11.17 — 예스24 전환 전 할 일
- Vercel 환경변수 YES24_API_KEY 등록(서버 전용, NEXT_PUBLIC 아님). 로컬 .env.local엔 넣어 둠.
- 전환일 결정 → 시행 7일 전에 YES24_START_AT 등록 + 재배포(공지 띠·약관 안내가 그때부터 보임).
- 예스24 애드온(구매 수익 링크)은 신청하지 않음 — 신청하면 해제 불가. 원하면 별도 결정.
- (2026.11.18 확정) 전환일 = 2026-11-25 00:00 KST. YES24_START_AT=2026-11-25T00:00:00+09:00 (로컬 .env.local 반영).
  공지 기간 7일을 채우려면 11.18 안에 master 합치기 + Vercel에 YES24_API_KEY·YES24_START_AT 등록 + 재배포.
- 확인(2026.11.18, 로컬 3002 로그인 상태): (+) 시트 검색·담기→담음 ✓→닫으면 책장 맨 앞 반영, 기록 0건 책 페이지 열림,
  이미 기록한 책은 '읽은 책'. 시험으로 담은 『구름빵: 작아도 괜찮아』는 저장 해제(책 정보 행은 남음 — 기록 0건이라 어디에도 노출 안 됨).

## [요청→data] 2026.11.18 — DB 주간 자동 백업 (운영자 요청: DB 소실 우려)
배경: Supabase 무료 플랜은 자동 백업이 없다(일일 백업은 Pro 이상). 지금은 DB가 지워지면 되돌릴 방법이 없음.
⚠️ GitHub 저장소 aylinative/chaekugajungwon은 공개(public) — 백업 파일은 반드시 암호화, 저장소에 커밋 금지.
방식(권장, 비용 0): GitHub Actions 주 1회 예약 실행
  1) .github/workflows/db-backup.yml — schedule cron '0 18 * * 0' (매주 월 03:00 KST) + workflow_dispatch(수동 실행)
  2) pg_dump: 서버와 같은 주 버전 클라이언트(Supabase 대시보드 Settings→Infrastructure에서 Postgres 버전 확인, 예: postgres:17 이미지)
     접속 = Supabase '세션 풀러' 연결 문자열(GitHub 러너는 IPv6 직접 연결 불가) → 저장소 Secret SUPABASE_DB_URL
     명령: pg_dump --format=custom --no-owner --no-privileges --schema=public --schema=auth -f backup.dump "$SUPABASE_DB_URL"
       (auth 스키마 포함 — 로그인 계정 users와 연결. storage 스키마는 메타데이터만이라 선택)
  3) 암호화: gpg --batch --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" → backup-YYYYMMDD.dump.gpg
     Secret BACKUP_PASSPHRASE — 운영자가 따로 안전하게 보관(잃으면 백업을 못 엶).
  4) actions/upload-artifact로 보관(retention-days: 90 → 최근 약 13주). 암호화된 파일만 올림.
  5) 실패 시 GitHub가 운영자 메일로 알림(기본). 
  6) 첫 실행 후 복원 시험 1회: 받은 파일 gpg 복호화 → 로컬/임시 DB에 pg_restore --list 로 테이블 목록 확인(운영 DB에 복원 금지).
  7) 복원 절차를 docs에 짧게 기록(누가·어떻게 받고·풀고·복원하는지).
빠지는 것: 참고사진(Storage post-images 파일)은 pg_dump에 안 들어감 → 필요하면 별도(용량 작으면 같은 작업에서 Storage API로 내려받아 암호화).
대안: Supabase Pro($25/월) 일일 백업 7일 보관 — 비용 대신 손 안 가는 방법.
운영자가 할 일: GitHub 저장소 Settings→Secrets에 SUPABASE_DB_URL, BACKUP_PASSPHRASE 등록(값은 채팅에 붙이지 말 것).
