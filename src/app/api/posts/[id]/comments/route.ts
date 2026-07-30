import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// 댓글 작성
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { content } = await request.json()
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: user.id, content: content.trim() })
    .select('id, content, created_at, user_id')
    .single()

  if (error || !data) {
    console.error('Comment insert error:', error)
    return NextResponse.json({ error: '댓글 작성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ comment: data })
}

// 댓글 삭제 (본인 것만 — RLS로도 강제됨)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { commentId } = await request.json()
  if (!commentId) {
    return NextResponse.json({ error: '댓글 id가 없습니다.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: '댓글 삭제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
