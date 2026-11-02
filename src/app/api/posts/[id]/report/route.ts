import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { isReportReason } from '@/lib/reports'

// 기록 신고 (애플 1.2·구글 UGC 정책) — 로그인한 이용자, 남의 기록만. 같은 기록 재신고는 성공처럼 처리.
// 운영자는 /moderation '신고된 기록'에서 확인·숨김.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { reason?: unknown; detail?: unknown }
  if (!isReportReason(body.reason)) return NextResponse.json({ error: '신고 사유를 골라 주세요.' }, { status: 400 })
  const detail = typeof body.detail === 'string' ? body.detail.trim().slice(0, 200) : ''

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).maybeSingle()
  if (!post) return NextResponse.json({ error: '기록을 찾을 수 없어요.' }, { status: 404 })
  if ((post as { user_id: string }).user_id === user.id)
    return NextResponse.json({ error: '내 기록은 신고할 수 없어요.' }, { status: 400 })

  const { error } = await supabase
    .from('reports')
    .insert({ post_id: postId, reporter_id: user.id, reason: body.reason, detail: detail || null })
  if (error && error.code !== '23505') {
    console.error('Report insert error:', error)
    return NextResponse.json({ error: '신고하지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
