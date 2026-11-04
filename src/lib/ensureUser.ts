import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import { authProviderOf, kakaoIdOf, LAST_LOGIN_COOKIE, LAST_LOGIN_MAX_AGE, type AuthProvider } from '@/lib/authProvider'

const DEFAULT_NICKNAME = '책육아정원 사용자'

// users에 새로 넣을 행. 닉네임은 공개되므로 카카오만 이름을 기본값으로 쓴다
// (구글·Apple 이름은 실명이라 가입 화면에서 직접 입력받기 전까지 기본 이름으로 둔다).
export function newUserRow(user: User, nickname?: string) {
  const provider = authProviderOf(user)
  const providerName =
    provider === 'kakao'
      ? user.user_metadata?.nickname || user.user_metadata?.name || user.user_metadata?.full_name
      : undefined
  return {
    id: user.id,
    nickname: nickname || providerName || DEFAULT_NICKNAME,
    kakao_id: kakaoIdOf(user),
    auth_provider: provider,
  }
}

// users 행이 없으면 만든다. upsert 금지 — kakao_id 열 읽기가 막혀 있어 권한 오류가 난다(supabase/hide_kakao_id.sql).
export async function ensureUserRow(supabase: SupabaseClient, user: User, nickname?: string) {
  const { data: existing } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle()
  if (existing) return { isNew: false, error: null }
  const { error } = await supabase.from('users').insert(newUserRow(user, nickname))
  return { isNew: true, error }
}

// 로그인 뒤 갈 곳: 신규는 가입 화면(닉네임·아이)을 거쳐 원래 보던 화면으로, 기존 회원은 바로.
export function afterLoginPath(isNew: boolean, next: string) {
  if (!isNew) return next
  return next === '/' ? '/onboarding' : `/onboarding?next=${encodeURIComponent(next)}`
}

// '지난번에 ○○로 로그인했어요' 표시용 — 화면에서 읽어야 해서 httpOnly가 아니다(수단 이름만 담김).
export function rememberLastLogin(response: NextResponse, provider: AuthProvider) {
  response.cookies.set(LAST_LOGIN_COOKIE, provider, {
    path: '/',
    maxAge: LAST_LOGIN_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
