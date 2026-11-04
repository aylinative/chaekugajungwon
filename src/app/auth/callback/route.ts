import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeNext } from '@/lib/loginNext'
import { authProviderOf } from '@/lib/authProvider'
import { afterLoginPath, ensureUserRow, rememberLastLogin } from '@/lib/ensureUser'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // 로그인 시트를 연 화면으로 복귀 — 우리 사이트 경로만 (2026.11.04)
  const next = safeNext(requestUrl.searchParams.get('next')) ?? '/'

  if (!code) {
    return NextResponse.redirect(new URL('/?error=auth', requestUrl.origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            console.error('Cookie set error:', error)
          }
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('Exchange error:', exchangeError)
    return NextResponse.redirect(new URL('/?error=auth', requestUrl.origin))
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    console.error('User fetch error:', userError)
    return NextResponse.redirect(new URL('/?error=auth', requestUrl.origin))
  }

  const user = userData.user

  // 신규 유저: 기본 레코드 생성 후 온보딩으로 이동.
  // 기존 유저: 닉네임은 건드리지 않는다.
  // (사용자가 온보딩/프로필에서 직접 바꾼 닉네임을 로그인 때마다 카카오 이름으로
  //  덮어쓰던 버그 수정. 카카오 이름은 최초 가입 시 기본값으로만 사용.)
  const { isNew, error: insertError } = await ensureUserRow(supabase, user)
  if (insertError) {
    console.error('User insert error:', insertError)
  }

  const response = NextResponse.redirect(new URL(afterLoginPath(isNew, next), requestUrl.origin))
  return rememberLastLogin(response, authProviderOf(user))
}