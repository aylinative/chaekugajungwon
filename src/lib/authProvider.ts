import type { User } from '@supabase/supabase-js'

// 로그인 수단 공용 판단 — 서버·브라우저 모두에서 쓴다(서버 전용 API import 금지).
export type AuthProvider = 'kakao' | 'google' | 'apple'

export const AUTH_PROVIDER_LABEL: Record<AuthProvider, string> = {
  kakao: '카카오',
  google: '구글',
  apple: 'Apple',
}

// '지난번에 ○○로 로그인했어요' 표시용 쿠키. 로그인이 성공했을 때만 서버가 남긴다.
export const LAST_LOGIN_COOKIE = 'last_login'
export const LAST_LOGIN_MAX_AGE = 60 * 60 * 24 * 365

export function isAuthProvider(v: unknown): v is AuthProvider {
  return v === 'kakao' || v === 'google' || v === 'apple'
}

// 가입할 때 쓴 로그인 수단. 알 수 없으면 기존 회원과 같은 카카오로 본다.
export function authProviderOf(user: Pick<User, 'app_metadata'>): AuthProvider {
  const provider = user.app_metadata?.provider
  return isAuthProvider(provider) ? provider : 'kakao'
}

// 카카오 회원번호. 카카오로 가입한 사람이 아니면 null —
// ⚠️ 구글 식별값도 숫자라서 구분 없이 읽으면 탈퇴 때 다른 사람의 카카오 연결을 끊을 수 있다.
export function kakaoIdOf(user: Pick<User, 'app_metadata' | 'identities' | 'user_metadata' | 'id'>): string | null {
  const identity = user.identities?.find((i) => i.provider === 'kakao')
  if (identity?.id) return identity.id
  if (authProviderOf(user) !== 'kakao') return null
  return String(user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? user.id)
}

// 구글은 앱 안 브라우저(웹뷰)의 로그인을 막는다(disallowed_useragent).
// - 다른 앱 안 브라우저(스레드·인스타·카톡 등): 버튼은 보이고, 누르면 기본 브라우저로 넘겨서 로그인 (lib/inAppBrowser.ts, 2026.11.05)
// - 우리 iOS 앱(BookgardeningApp): 시스템 로그인 창 연동 전까지 숨김 (iOS 작업 때 ASWebAuthenticationSession으로)
// Android 앱(TWA)은 크롬으로 열려 일반 브라우저로 잡힌다.
export function canUseGoogleLogin(userAgent: string): boolean {
  return !/BookgardeningApp/i.test(userAgent)
}
