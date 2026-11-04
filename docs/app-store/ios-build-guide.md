# iOS 앱 빌드·TestFlight 가이드 (Mac 없이 — 아이패드/PC 브라우저만)

앱 구조: `capacitor.config.ts` — 앱이 https://bookgardening.co.kr 을 그대로 띄우는 껍데기(원격 URL 방식).
- 웹 화면·서버를 고치면 **앱 심사 없이** 바로 반영된다.
- 권한 문구·아이콘·네이티브 플러그인(애플 로그인·푸시)을 바꿀 때만 새로 빌드하고 심사를 받는다.
- iPhone 전용(`TARGETED_DEVICE_FAMILY = 1`). 아이패드에서는 iPhone 앱 호환 모드로 열린다(TestFlight 테스트 가능).
  → App Store에 **아이패드 스크린샷을 낼 필요 없음**.
- 번들 ID: `kr.co.bookgardening.app` (Android 패키지명과 같음)

## 1. App Store Connect (appstoreconnect.apple.com)
1. **Certificates, Identifiers & Profiles → Identifiers → +** → App IDs → App
   - Bundle ID(Explicit): `kr.co.bookgardening.app`, 설명: `Bookgardening` (이 칸은 한글 불가 — 내부 관리용이라 사용자에게 안 보임)
   - Capabilities: **Sign In with Apple** 체크 (Push Notifications는 v1.1에서 추가)
2. **앱 → + → 신규 앱**: 플랫폼 iOS, 이름 '책육아정원', 기본 언어 한국어, 번들 ID 위에서 만든 것, SKU 예: `bookgardening-ios`
3. 만든 앱의 **앱 정보 → 일반 정보 → Apple ID**(숫자 10자리)를 적어 둔다 → `codemagic.yaml`의 `APP_STORE_APPLE_ID`
4. **사용자 및 액세스 → 통합 → App Store Connect API → 팀 키 +**
   - 이름: codemagic, 액세스: **App Manager**
   - 생성 후 **Issuer ID**, **Key ID** 적어 두고 **.p8 파일 다운로드**(한 번만 받을 수 있음 — 아이패드 '파일' 앱에 보관)

## 2. Codemagic (codemagic.io) — 무료 플랜: 월 500분(macOS M2), 이 앱 빌드 1회 약 5~10분
1. GitHub 계정으로 가입 → **Add application** → `aylinative/chaekugajungwon` 선택 → 'codemagic.yaml' 방식
2. **Teams → (개인) → Integrations → Developer Portal / App Store Connect → Connect**
   - Name: `bookgardening-asc` (yaml의 `integrations.app_store_connect`와 같아야 함)
   - Issuer ID, Key ID, .p8 파일 업로드
3. **Code signing identities → iOS certificates → Generate certificate**(Apple Distribution) — Codemagic이 만들어 줌
   - 이어서 **iOS provisioning profiles → Fetch profiles**(App Store용, `kr.co.bookgardening.app`)
   - (yaml의 `ios_signing`이 빌드 때 이 둘을 자동으로 고른다)
4. `codemagic.yaml`의 `APP_STORE_APPLE_ID` 값을 실제 숫자로 바꿔 커밋(또는 Claude에게 숫자를 알려주기)
5. 앱 화면 → **Start new build** → 브랜치 선택 → 워크플로 `iOS → TestFlight`
6. 성공하면 10~30분 뒤 App Store Connect **TestFlight** 탭에 빌드가 뜬다
   - '수출 규정 준수'는 Info.plist에 `ITSAppUsesNonExemptEncryption=false`로 넣어 두어 자동 통과

## 3. TestFlight로 아이패드에서 테스트
- TestFlight → **내부 테스트** 그룹 만들기 → 본인 Apple 계정 추가 → 아이패드에 TestFlight 앱 설치 → 초대 수락
- 꼭 확인할 것
  - [ ] 카카오 로그인 → 로그인 유지(앱을 껐다 켜도)
  - [ ] '카카오톡으로 로그인' 선택 시 카카오톡 앱으로 넘어갔다가 **돌아오지 못하는지** (안 되면 알려주기 — 카카오계정 로그인으로 유도 필요)
  - [ ] 기록하기 → 바코드 스캔(카메라 권한 창 문구 확인)
  - [ ] 참고사진 올리기(사진 보관함)
  - [ ] '책 정보 보기'·문의 구글폼 등 바깥 링크 → 사파리로 열리고 앱으로 돌아오기
  - [ ] 비행기 모드로 앱 열기 → '인터넷 연결을 확인해 주세요' 화면

## 4. 바코드 스캔 — 지금 것 그대로 사용
웹의 스캐너(`components/record/BarcodeScanner.tsx`)가 앱 안에서도 그대로 동작한다.
- iOS 앱: Capacitor가 웹뷰 카메라 요청을 허용하고, 처음 한 번 iOS 권한 창(위 `NSCameraUsageDescription` 문구)이 뜬다.
- Android 앱(TWA): 크롬으로 열리므로 사이트와 동일(이미 실기기 확인).
- 심사 메모에 "책 뒤표지 바코드 스캔으로 책을 찾는다"를 앱 기능으로 적는다(가이드라인 4.2 대비).

## 파일
- `capacitor.config.ts` — 앱 설정(사이트 주소, 앱 안에서 열 도메인)
- `capacitor-shell/index.html` — 사이트를 못 불러올 때 오프라인 안내
- `ios/` — Xcode 프로젝트(Capacitor 생성). 아이콘 `ios/App/App/Assets.xcassets/AppIcon.appiconset`(home_image.png 1024)
- `codemagic.yaml` — 클라우드 빌드
- ⚠️ 사이트 도메인을 바꾸면 `capacitor.config.ts`의 `server.url`·`allowNavigation`도 고치고 새로 빌드할 것
