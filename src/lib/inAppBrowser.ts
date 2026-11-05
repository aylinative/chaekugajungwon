// 앱 안 브라우저(스레드·인스타·카톡·네이버 등) 판단과 '기본 브라우저로 열기' (2026.11.05 운영자)
// 구글은 앱 안 브라우저(웹뷰)의 로그인을 정책으로 막는다(403 disallowed_useragent) — 그 자리에서 구글 로그인은 불가.
// 그래서 버튼을 숨기지 않고, 누르면 같은 로그인 주소를 폰의 기본 브라우저(사파리·크롬)로 넘겨 그쪽에서 로그인한다.
// ※ 우리 iOS 앱(BookgardeningApp)은 여기 해당하지 않음 — 앱은 시스템 로그인 창(ASWebAuthenticationSession)으로 따로 처리.

// 스레드 앱의 브라우저는 'Barcelona'(스레드 개발명)로 표시된다
const IN_APP_UA = /KAKAOTALK|NAVER|DaumApps|Instagram|Barcelona|Threads|FBAN|FBAV|FB_IAB|Line\/|Snapchat|; wv\)/i

export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_UA.test(userAgent)
}

// 기본 브라우저로 여는 주소. 앱마다 통하는 방법이 달라서 순서대로 고른다.
// - 카카오톡: kakaotalk://web/openExternal
// - 라인: ?openExternalBrowser=1
// - 안드로이드: intent:// (기본 브라우저 선택)
// - 아이폰: x-safari-https:// (iOS 17 이상 사파리) — 안 열리면 화면의 '⋯ → 브라우저로 열기' 안내로
export function externalBrowserUrl(absoluteUrl: string, userAgent: string): string {
  const url = new URL(absoluteUrl)
  if (/KAKAOTALK/i.test(userAgent)) return `kakaotalk://web/openExternal?url=${encodeURIComponent(absoluteUrl)}`
  if (/Line\//i.test(userAgent)) {
    url.searchParams.set('openExternalBrowser', '1')
    return url.toString()
  }
  if (/Android/i.test(userAgent)) {
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;action=android.intent.action.VIEW;end`
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) return `x-safari-${absoluteUrl}`
  return absoluteUrl
}
