import { NextResponse } from 'next/server'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'

// 운영자: 한 기록에 들어온 신고를 한 번에 처리 — resolved(숨김 등 조치함) / dismissed(문제없음).
// 기록 숨김 자체는 기존 /api/posts/[id]/hide를 쓴다.
export async function PATCH(request: Request) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  if (!(await getIsOperator(supabase, user.id))) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as { post_id?: unknown; status?: unknown }
  if (typeof body.post_id !== 'string' || !['resolved', 'dismissed'].includes(String(body.status))) {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
  }
  const { error } = await supabase
    .from('reports')
    .update({ status: body.status })
    .eq('post_id', body.post_id)
    .eq('status', 'pending')
  if (error) {
    console.error('Report update error:', error)
    return NextResponse.json({ error: '처리하지 못했어요.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
