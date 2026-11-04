import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { safeNext } from '@/lib/loginNext'

// 카카오·구글 로그인 시작 — Supabase가 만든 로그인 주소로 보낸다.
// PKCE 쿠키는 redirect 응답에 직접 실어야 콜백까지 살아남는다.
export async function startOAuth(
  request: Request,
  provider: 'kakao' | 'google',
  queryParams: Record<string, string>
) {
  // 콜백 주소를 요청 origin에서 동적으로 만든다 — localhost/프리뷰/프로덕션 모두 자동 대응.
  // (하드코딩하면 배포 후 인증이 localhost로 튕겨 로그인 불가)
  // ※ 이 origin은 Supabase Auth Redirect URLs 허용목록에도 등록돼 있어야 한다.
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin
  // 로그인 후 돌아갈 화면(로그인 시트를 연 페이지) — 우리 사이트 경로만 (2026.11.04)
  const next = safeNext(requestUrl.searchParams.get('next'))
  const cookieStore = await cookies()
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(incoming) {
          cookiesToSet.push(...incoming)
          try {
            incoming.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            console.error('Cookie set error:', error)
          }
        },
      },
    }
  )

  const { data } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: next ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : `${origin}/auth/callback`,
      queryParams,
    },
  })

  if (data.url) {
    const response = NextResponse.redirect(data.url)
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  return NextResponse.redirect(new URL('/', origin))
}
