import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 현재 로그인 유저가 운영자(users.is_operator)인지. 비로그인/일반 유저면 false.
export async function getIsOperator(
  supabase: SupabaseClient,
  userId?: string
): Promise<boolean> {
  if (!userId) return false
  const { data } = await supabase
    .from('users')
    .select('is_operator')
    .eq('id', userId)
    .maybeSingle()
  return Boolean((data as { is_operator: boolean } | null)?.is_operator)
}

// Server Component / Route Handler 공용 Supabase 클라이언트.
// setAll은 Server Component에서 실패할 수 있어 try/catch로 감싼다.
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
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
          } catch {
            // Server Component에서는 쿠키 쓰기가 불가할 수 있음 → 무시
          }
        },
      },
    }
  )
}
