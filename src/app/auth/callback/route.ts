import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

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
  const nickname =
    user.user_metadata?.nickname ||
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    '책육아정원 사용자'

  // kakao_id는 users 테이블에서 NOT NULL. 카카오 provider id를 사용.
  const kakaoId = String(
    user.user_metadata?.provider_id ??
      user.user_metadata?.sub ??
      user.id
  )

  // 기존 유저 여부 확인 (있으면 returning, 없으면 신규)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existingUser) {
    // 신규 유저: 기본 레코드 생성 후 온보딩으로 이동
    const { error: insertError } = await supabase
      .from('users')
      .insert({ id: user.id, nickname, kakao_id: kakaoId })
    if (insertError) {
      console.error('User insert error:', insertError)
    }
    return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
  }

  // 기존 유저: 닉네임은 건드리지 않는다.
  // (사용자가 온보딩/프로필에서 직접 바꾼 닉네임을 로그인 때마다 카카오 이름으로
  //  덮어쓰던 버그 수정. 카카오 이름은 최초 가입 시 기본값으로만 사용.)

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}