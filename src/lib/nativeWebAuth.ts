// iOS 앱의 구글 로그인 — 구글은 앱 안 웹뷰의 로그인을 막아서(403 disallowed_useragent)
// 시스템 로그인 창(앱의 WebAuth 플러그인, ios/App/App/WebAuthPlugin.swift)으로 열고, 돌아온 code로 웹뷰에 세션을 만든다.
// 플러그인이 없는 앱 버전이나 일반 브라우저에서는 쓸 수 없다 → 버튼을 숨긴다.
// ⚠️ Supabase Redirect URLs에 kr.co.bookgardening.app://auth 가 등록돼 있어야 한다.
const CALLBACK_SCHEME = 'kr.co.bookgardening.app'

interface WebAuthPlugin {
  start(options: { url: string; callbackScheme: string }): Promise<{ url: string }>
}

function plugin(): WebAuthPlugin | undefined {
  const cap = (window as unknown as { Capacitor?: { Plugins?: { WebAuth?: WebAuthPlugin } } }).Capacitor
  return cap?.Plugins?.WebAuth
}

export function isNativeGoogleAvailable(): boolean {
  return /BookgardeningApp\/iOS/.test(navigator.userAgent) && Boolean(plugin())
}

export async function nativeGoogleLogin() {
  const webAuth = plugin()
  if (!webAuth) throw new Error('구글 로그인을 쓸 수 없어요.')
  // Supabase 클라이언트는 이때만 불러온다(모든 화면의 첫 로딩을 무겁게 하지 않게).
  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${CALLBACK_SCHEME}://auth`,
      skipBrowserRedirect: true, // 웹뷰를 이동시키지 않고 주소만 받는다
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error || !data.url) throw error ?? new Error('로그인 주소를 받지 못했어요.')

  const { url } = await webAuth.start({ url: data.url, callbackScheme: CALLBACK_SCHEME })
  const code = new URL(url).searchParams.get('code')
  if (!code) throw new Error('로그인 응답에 code가 없어요.')
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) throw exchangeError
}
