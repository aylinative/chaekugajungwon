// iOS 앱의 Apple 기본 로그인 창 호출. 사이트를 원격으로 띄우는 구조라 @capacitor/core 없이
// 앱이 넣어 주는 window.Capacitor로 앱의 AppleLogin 플러그인(ios/App/App/AppleLoginPlugin.swift)을 부른다.
// 플러그인이 없는 앱 버전이나 일반 브라우저에서는 쓸 수 없다 → 버튼을 숨긴다.

interface AppleLoginPlugin {
  signIn(options: { nonce: string }): Promise<{ identityToken: string; authorizationCode: string }>
}

function plugin(): AppleLoginPlugin | undefined {
  const cap = (window as unknown as { Capacitor?: { Plugins?: { AppleLogin?: AppleLoginPlugin } } }).Capacitor
  return cap?.Plugins?.AppleLogin
}

export function isAppleLoginAvailable(): boolean {
  return /BookgardeningApp\/iOS/.test(navigator.userAgent) && Boolean(plugin())
}

export function isAppleCancel(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'CANCELED'
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Apple에는 nonce의 해시를, Supabase에는 원본을 준다 — 토큰을 다른 곳에서 재사용하지 못하게 하는 장치.
export async function appleNativeAuth() {
  const apple = plugin()
  if (!apple) throw new Error('Apple 로그인을 쓸 수 없어요.')
  const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')
  const { identityToken, authorizationCode } = await apple.signIn({ nonce: await sha256Hex(rawNonce) })
  return { identityToken, authorizationCode, rawNonce }
}
