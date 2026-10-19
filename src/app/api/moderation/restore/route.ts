import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { revalidateFeed } from '@/lib/cacheTags'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'

// 숨김 복구 — 운영자 전용. { type: 'post', id } 기록의 hidden_at을 null로.
// (댓글 기능은 오픈 전 제외 2026.10 — 댓글 복구 경로도 함께 제거)
export async function POST(request: Request) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  if (!(await getIsOperator(supabase, user.id))) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { type, id } = await request.json().catch(() => ({}))
  if (type !== 'post' || !id) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { error } = await supabase.from('posts').update({ hidden_at: null }).eq('id', id)
  if (error) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: '복구에 실패했습니다.' }, { status: 500 })
  }

  revalidatePath('/', 'layout')
  revalidateFeed()
  return NextResponse.json({ success: true })
}
