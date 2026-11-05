import type { CapacitorConfig } from '@capacitor/cli'

// iOS 앱(App Store) 껍데기 설정 — 앱은 실서비스 사이트를 그대로 띄운다(원격 URL 방식).
// 웹 화면·서버 변경은 앱 심사 없이 바로 반영되고, 네이티브 설정(권한·플러그인)을 바꿀 때만 새 빌드·심사.
// Android는 TWA(Play 스토어, public/.well-known/assetlinks.json)라 이 설정을 쓰지 않는다.
const config: CapacitorConfig = {
  appId: 'kr.co.bookgardening.app', // Android 패키지명과 동일 — App Store Connect 번들 ID도 이 값으로
  appName: '책육아정원',
  // server.url을 못 불러올 때만 보이는 오프라인 안내(앱에 내장)
  webDir: 'capacitor-shell',
  server: {
    url: 'https://bookgardening.co.kr',
    errorPath: 'index.html', // 사이트를 못 불러올 때 capacitor-shell의 오프라인 안내를 띄운다
    // 여기 없는 도메인으로 이동하면 앱 밖(사파리)으로 나간다 → 로그인 쿠키가 끊기므로
    // 로그인 경로(Supabase·카카오·애플)는 반드시 앱 안에서 열리게 허용.
    allowNavigation: [
      'bookgardening.co.kr',
      'www.bookgardening.co.kr',
      '*.supabase.co',
      'kauth.kakao.com',
      'accounts.kakao.com',
      'logins.daum.net',
      'appleid.apple.com',
    ],
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#FBF6EC',
    // 사이트가 앱 안에서 열렸는지 구분용(User-Agent 끝에 붙음) — 애플 로그인 버튼 노출 등에 사용
    appendUserAgent: 'BookgardeningApp/iOS',
  },
}

export default config
