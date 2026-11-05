// 로그인 후 돌아갈 주소 — 우리 사이트 안 경로만 허용(외부 주소로 튕기는 오픈 리다이렉트 방지)
// '/book/…', '/posts/…?x=1' 같은 상대 경로만. '//evil.com', '/api/…', '/auth/…'는 버린다.
export function safeNext(v: string | null | undefined): string | null {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return null
  if (/^\/(api|auth)(\/|$|\?)/.test(v)) return null
  return v
}

// 로그인 시작 주소 (돌아올 곳 포함)
export const oauthLoginUrl = (provider: 'kakao' | 'google', next?: string | null) => {
  const safe = safeNext(next)
  return safe ? `/api/auth/${provider}?next=${encodeURIComponent(safe)}` : `/api/auth/${provider}`
}

// iOS 앱의 Apple·구글 로그인 마무리 주소 (/auth/finish)
export const nativeFinishUrl = (next?: string | null) => {
  const safe = safeNext(next)
  return safe ? `/auth/finish?next=${encodeURIComponent(safe)}` : '/auth/finish'
}
