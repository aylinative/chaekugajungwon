import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { afterLoginPath, ensureUserRow, rememberLastLogin } from '@/lib/ensureUser'
import { safeNext } from '@/lib/loginNext'

// iOS 앱의 Apple 로그인 마무리 — 브라우저에서 signInWithIdToken으로 세션을 만든 뒤 여기로 온다.
// 카카오·구글의 /auth/callback과 같은 가입 처리를 한다.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const next = safeNext(requestUrl.searchParams.get('next')) ?? '/'
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/?error=auth', requestUrl.origin))

  const { isNew, error } = await ensureUserRow(supabase, user)
  if (error) console.error('User insert error:', error)

  const response = NextResponse.redirect(new URL(afterLoginPath(isNew, next), requestUrl.origin))
  return rememberLastLogin(response, 'apple')
}
