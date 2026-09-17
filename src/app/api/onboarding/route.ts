import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// 온보딩 완료 표시 — users.onboarded_at을 현재 시각으로 기록(계정당 1회, 기기 무관).
// OnboardingModal이 닫힐 때 호출. 실패해도 localStorage가 같은 기기 재노출은 막으므로 치명적이지 않다.
export async function POST() {
  try {
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
            } catch {}
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 이미 값이 있으면 덮어쓰지 않는다(최초 완료 시각 보존)
    const { error } = await supabase
      .from('users')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('onboarded_at', null)

    if (error) {
      console.error('Onboarding mark error:', error)
      return NextResponse.json({ error: '온보딩 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding route error:', error)
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 })
  }
}
