import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'

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

// 댓글 숨김(소프트 삭제) — 작성자 본인 또는 운영자. hidden_at 세팅으로 조회 제외.
export async function DELETE(
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

  const { commentId } = await request.json()
  if (!commentId) {
    return NextResponse.json({ error: '댓글 id가 없습니다.' }, { status: 400 })
  }

  // 권한 확인: 본인 댓글이거나 운영자
  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', commentId)
    .maybeSingle()
  if (!comment) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  }
  const isOwner = (comment as { user_id: string }).user_id === user.id
  const isOperator = await getIsOperator(supabase, user.id)
  if (!isOwner && !isOperator) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('comments')
    .update({ hidden_at: new Date().toISOString() })
    .eq('id', commentId)

  if (error) {
    return NextResponse.json({ error: '숨김 처리에 실패했습니다.' }, { status: 500 })
  }

  revalidatePath(`/posts/${postId}`)
  return NextResponse.json({ success: true })
}
