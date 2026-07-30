import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// 좋아요 토글: 이미 눌렀으면 취소, 아니면 추가. { liked, count } 반환.
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

  const { data: existing } = await supabase
    .from('likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  let liked: boolean
  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    if (error) {
      return NextResponse.json({ error: '좋아요 취소에 실패했습니다.' }, { status: 500 })
    }
    liked = false
  } else {
    const { error } = await supabase
      .from('likes')
      .insert({ post_id: postId, user_id: user.id })
    if (error) {
      return NextResponse.json({ error: '좋아요에 실패했습니다.' }, { status: 500 })
    }
    liked = true
  }

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  return NextResponse.json({ liked, count: count ?? 0 })
}
