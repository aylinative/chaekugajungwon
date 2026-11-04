import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { safeNext } from '@/lib/loginNext'

export async function GET(request: Request) {
  // 콜백 주소를 요청 origin에서 동적으로 만든다 — localhost/프리뷰/프로덕션 모두 자동 대응.
  // (하드코딩하면 배포 후 카카오 인증이 localhost로 튕겨 로그인 불가)
  // ※ 이 origin은 Supabase Auth Redirect URLs 허용목록 + 카카오 콘솔에도 등록돼 있어야 한다.
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin
  // 로그인 후 돌아갈 화면(로그인 시트를 연 페이지) — 우리 사이트 경로만 (2026.11.04)
  const next = safeNext(requestUrl.searchParams.get('next'))
  const cookieStore = await cookies()
  const cookiesToSet: Array<{name: string; value: string; options: any}> = []

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
    provider: 'kakao',
    options: {
      redirectTo: next ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : `${origin}/auth/callback`,
      queryParams: {
        // 닉네임만 받는다 — 프로필 사진은 서비스에서 쓰지 않아 수집하지 않음(개인정보 최소 수집, 2026.11.03).
        // 카카오 디벨로퍼스 동의항목의 '프로필 사진'도 '사용 안 함'으로 맞출 것. 바꾸면 /privacy 수집 항목도 함께.
        scope: 'profile_nickname',
      },
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