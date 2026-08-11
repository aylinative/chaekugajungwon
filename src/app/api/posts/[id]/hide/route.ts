import { NextResponse } from 'next/server'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'

// 게시물 숨김(소프트 삭제) — 작성자 본인 또는 운영자.
// hidden_at 세팅으로 조회에서 제외한다(복구 가능). RLS가 본인/운영자만 update 허용.
export async function POST(
  _request: Request,
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

  // 권한 확인: 본인 글이거나 운영자
  const { data: post } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .maybeSingle()
  if (!post) {
    return NextResponse.json({ error: '게시물을 찾을 수 없습니다.' }, { status: 404 })
  }
  const isOwner = (post as { user_id: string }).user_id === user.id
  const isOperator = await getIsOperator(supabase, user.id)
  if (!isOwner && !isOperator) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('posts')
    .update({ hidden_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) {
    console.error('Post hide error:', error)
    return NextResponse.json({ error: '숨김 처리에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
