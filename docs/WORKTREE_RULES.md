# 워크트리 작업 지침 — 합칠 때 충돌 방지 (2026.11.17)

책육아정원은 탭(에이전트)마다 워크트리를 하나씩 쓴다. 이 문서는 **각 탭이 작업 시작 전에 읽고 따라야 하는 규칙**이다.
목표: 작업 중에는 서로 안 건드리고, master에 합칠 때 충돌이 거의 없게 한다.

---

## 0. 경로 확인 (매번)

작업을 시작할 때마다, 그리고 파일을 고치거나 git 명령을 실행하기 전마다:
```
git -C C:\Users\김가현\chaekugajungwon-wt\<역할> rev-parse --show-toplevel
git -C C:\Users\김가현\chaekugajungwon-wt\<역할> branch --show-current
```
- 경로가 `chaekugajungwon-wt\<역할>`, 브랜치가 `wt/<역할>`이 아니면 **멈추고 사용자에게 알린다.**
- 파일 경로는 항상 자기 워크트리 기준 절대 경로를 쓰고, 명령은 그 폴더에서 실행한다. (기존 탭은 터미널 시작 위치가 본 폴더라서 실수하기 쉽다.)
- 답변 끝에 매번 `작업 경로: … / 브랜치: …`를 한 줄로 적는다.

## 1. 워크트리·브랜치·역할

| 탭 | 워크트리 폴더 | 브랜치 | 역할 | 포트 |
|---|---|---|---|---|
| 본 폴더 | `C:\Users\김가현\chaekugajungwon` | `master` | **합치기·배포 전용** (직접 기능 작업 금지) | 3000 |
| A | `C:\Users\김가현\chaekugajungwon-wt\service-taxonomy` | `wt/service-taxonomy` | 1번 서비스 기능 — 텍소노미 | 3001 |
| B | `C:\Users\김가현\chaekugajungwon-wt\service-record` | `wt/service-record` | 1번 서비스 기능 — 기록·페이지 | 3002 |
| (새 탭) | `C:\Users\김가현\chaekugajungwon-wt\data` | `wt/data` | 2번 DB — 책 기록·주제 등록 등 입력 데이터 | 3003 |
| C | `C:\Users\김가현\chaekugajungwon-wt\store` | `wt/store` | 3번 앱스토어 — 등록·심사 점검 | 3004 |

- 개발 서버는 자기 포트로: `npm run dev -- -p 3001`
- 자기 워크트리 폴더 밖의 파일은 고치지 않는다. (읽기는 자유. 다른 브랜치 확인은 `git diff master..wt/xxx`)

## 2. 파일 담당 (가장 중요)

**자기 담당 파일만 고친다.** 담당이 아닌 파일을 고쳐야 하면 직접 고치지 말고, 담당 탭에 넘길 내용을 자기 작업 기록(4번)에 `[요청→담당]`으로 적고 사용자에게 알린다.

| 담당 | 파일 |
|---|---|
| **store** | `ios/**`, `android/**`, `capacitor.config.ts`, `capacitor-shell/**`, `codemagic.yaml`, `docs/app-store/**`, `public/.well-known/**`, `src/app/api/apple-app-site-association/**`, `앱스토어/**` |
| **data** | `supabase/**`(SQL 전부), `scripts/taxonomy/**`, `docs/taxonomy/*.csv`·`*.xlsx`, 아카이빙 데이터 파일(`*.xlsx`, `DB 아카이빙 추가/**`) |
| **service-taxonomy** | `src/lib/topic*.ts`, `src/lib/tag*.ts`, `src/components/record/Topic*.tsx`, `src/components/feed/TopicFilter*.tsx`, `src/components/admin/TagManager.tsx`, `docs/taxonomy/*.md` |
| **service-record** | 위에 없는 `src/app/**`, `src/components/**`, `src/lib/**` |

## 3. 공용 파일 (여러 탭이 같이 쓰는 파일) — 규칙 있음

아래 파일은 충돌이 잘 난다. **고치기 전에 사용자에게 "공용 파일 ○○을 고칩니다"라고 먼저 알리고**, 최소한으로만 고친다.

`CLAUDE.md`, `package.json`, `package-lock.json`, `next.config.ts`, `src/app/layout.tsx`, `src/middleware.ts`,
`src/app/globals.css`, `src/lib/constants.ts`, `src/lib/supabase*.ts`, `src/lib/cacheTags.ts`, `.gitignore`, `vercel.json`

- **`CLAUDE.md`는 워크트리에서 고치지 않는다.** 대신 4번 작업 기록에 적는다. CLAUDE.md 반영은 master에서 합칠 때 한 번에 한다.
- **`package.json` / `package-lock.json`**: 패키지 추가는 한 번에 한 브랜치만. `package-lock.json`이 충돌하면 손으로 고치지 말고, `package.json`만 정리한 뒤 `npm install`로 다시 만든다.
- 공용 파일은 **기존 줄을 바꾸기보다 새 줄을 추가**하는 방식으로 고친다. 정렬·들여쓰기·줄바꿈 같은 서식만 바꾸는 수정은 하지 않는다.

## 4. 작업 기록 — CLAUDE.md 대신 각자 파일에

지금까지는 모든 탭이 CLAUDE.md 5.2절 끝에 기록을 덧붙여서 합칠 때 반드시 충돌이 난다. 이제부터는:

- 각 탭은 **자기 파일에만** 기록한다: `docs/worklog/<역할>.md` (`service-taxonomy.md`, `service-record.md`, `data.md`, `store.md`)
- 형식: CLAUDE.md에 들어갈 문장 그대로, 넣을 위치(절 번호)를 앞에 표시.
  ```
  ## 2026.11.17 — 사파리 앱 배너
  → CLAUDE.md 5.2절에 추가:
    ■ 사파리 스마트 앱 배너(layout itunes appId ..., 열기=앱 첫 화면).
  ```
- master에서 합칠 때, 합치는 쪽이 이 기록을 CLAUDE.md에 옮겨 넣고 기록 파일의 해당 항목에 `(반영됨 커밋번호)`를 붙인다.

## 5. DB 규칙 (DB는 모든 워크트리가 같이 쓴다)

워크트리는 코드만 나눈다. Supabase DB는 하나다.

- **스키마 변경 SQL은 data 탭만 만든다.** 다른 탭은 `[요청→data]`로 넘긴다.
- SQL 파일 이름은 `supabase/YYYYMMDD_역할_내용.sql` (예: `20261117_data_add_topic_alias.sql`) — 이름이 겹치지 않게.
- **추가만 한다**: 새 컬럼은 NULL 허용 또는 기본값을 넣어서 추가. 다른 브랜치 코드가 쓰는 컬럼·테이블의 **이름 변경·삭제는 금지**. 꼭 필요하면 ① 새 것 추가 → ② 모든 브랜치가 master에 합쳐진 뒤 ③ 옛 것 삭제, 3단계로 나눈다.
- DB에 실제 적용(SQL 실행)하기 전에 사용자 승인을 받고, 적용한 사실을 `docs/worklog/data.md`에 기록한다.
- 성능·피드·DB 작업 전 `node scripts/check-scale.mjs` 점검 규칙(CLAUDE.md)은 그대로.

## 6. 합치기 규칙

1. **작게, 자주 합친다.** 기능 하나가 끝나면 바로 합친다. 브랜치를 며칠씩 묵히지 않는다.
2. **합치기 전 점검**: 본 폴더에서 `node scripts/check-overlap.mjs` 실행. 🔴(두 브랜치가 같은 파일을 고침)이 있으면 합치기 전에 사용자에게 알린다.
3. **합치는 곳은 본 폴더(master) 한 곳.** 한 번에 한 브랜치씩:
   ```
   cd C:\Users\김가현\chaekugajungwon
   git merge --no-ff wt/xxx
   ```
4. **합친 직후 다른 탭은 master를 받아온다** (각자 워크트리에서): `git merge master`
   각 탭은 **작업을 시작할 때마다** 먼저 `git merge master`를 한다.
5. **충돌이 나면 멈추고 사용자에게 보고한다.** 한쪽 내용을 통째로 버리는 식(`--ours`/`--theirs`)으로 임의 해결하지 않는다.
6. 합친 뒤 `npx tsc --noEmit` (타입 검사) 통과를 확인한다.

## 7. 배포 규칙

- **master에 push하면 실제 사이트(Vercel)에 배포된다.** push는 본 폴더에서, 사용자 승인 후, 합친 다음에만.
- 워크트리 브랜치는 push해도 미리보기 배포만 된다(실제 사이트 영향 없음).
- 앱 빌드(Codemagic)·심사 제출은 store 탭만, 사용자 승인 후.

## 8. 하지 말 것

- 다른 워크트리 폴더의 파일 수정
- 본 폴더(master)에서 직접 기능 작업
- `git push --force`, `git reset --hard`, 다른 브랜치 삭제
- 워크트리에서 `CLAUDE.md` 수정
