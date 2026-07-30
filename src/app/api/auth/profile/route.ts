import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { nickname, children } = await request.json()

    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json({ error: '닉네임이 필요합니다.' }, { status: 400 })
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

    // users 행이 없으면 생성, 있으면 닉네임 갱신 (콜백에서 생성 누락된 경우 대비)
    const kakaoId = String(
      user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? user.id
    )
    const { error: nicknameError } = await supabase
      .from('users')
      .upsert(
        { id: user.id, kakao_id: kakaoId, nickname: nickname.trim() },
        { onConflict: 'id' }
      )

    if (nicknameError) {
      console.error('User upsert error:', nicknameError)
      return NextResponse.json({ error: '닉네임 저장에 실패했습니다.' }, { status: 500 })
    }

    // 아이 정보 동기화: children 배열이 오면 항상 "기존 삭제 후 재삽입".
    // (빈 배열이면 전체 삭제 → 마이페이지에서 아이를 모두 지울 수 있음.
    //  children이 아예 없으면[undefined] 건드리지 않음.)
    if (Array.isArray(children)) {
      const { error: deleteError } = await supabase
        .from('children')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Children delete error:', deleteError)
        return NextResponse.json({ error: '아이 정보 초기화에 실패했습니다.' }, { status: 500 })
      }

      const validChildren = children.filter(
        (c: { birth_date: string }) => c.birth_date && typeof c.birth_date === 'string'
      )

      if (validChildren.length > 0) {
        const childRecords = validChildren.map((c: { birth_date: string }) => ({
          user_id: user.id,
          birth_date: c.birth_date,
        }))

        const { error: insertError } = await supabase
          .from('children')
          .insert(childRecords)

        if (insertError) {
          console.error('Children insert error:', insertError)
          return NextResponse.json({ error: '아이 정보 저장에 실패했습니다.' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile save error:', error)
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
