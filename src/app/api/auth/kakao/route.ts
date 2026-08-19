import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // 콜백 주소를 요청 origin에서 동적으로 만든다 — localhost/프리뷰/프로덕션 모두 자동 대응.
  // (하드코딩하면 배포 후 카카오 인증이 localhost로 튕겨 로그인 불가)
  // ※ 이 origin은 Supabase Auth Redirect URLs 허용목록 + 카카오 콘솔에도 등록돼 있어야 한다.
  const origin = new URL(request.url).origin
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
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        scope: 'profile_nickname profile_image',
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