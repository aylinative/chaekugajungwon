import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// 저장(북마크) 토글 API. 단위는 book_id (post_id 아님 — CLAUDE.md 12장).
// bookmark_count는 DB 트리거(trg_bookmarks_count)가 자동 갱신하므로 여기서 증감하지 않는다.

async function getBookmarkCount(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  bookId: string
): Promise<number> {
  const { data } = await supabase
    .from('books')
    .select('bookmark_count')
    .eq('id', bookId)
    .maybeSingle()
  return (data as { bookmark_count: number } | null)?.bookmark_count ?? 0
}

// 저장
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 이미 기록한 책은 저장 불가 — ①'함께 읽은 책'과 ②'읽고 싶은 책'에 동시에 존재하면 모순.
  // (저장 모집단 = '아직 안 읽은 사람'. 기록 시 자동 해제와 쌍을 이루는 역방향 가드)
  const { data: myPost } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .limit(1)
    .maybeSingle()
  if (myPost) {
    return NextResponse.json(
      { error: '이미 아이와 함께 읽은 책이에요.', alreadyRecorded: true },
      { status: 409 }
    )
  }

  // UNIQUE(user_id, book_id) 충돌은 에러가 아니라 "이미 저장됨"으로 무시 처리
  const { error } = await supabase
    .from('bookmarks')
    .upsert(
      { user_id: user.id, book_id: bookId },
      { onConflict: 'user_id,book_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('Bookmark insert error:', error)
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    bookmarked: true,
    count: await getBookmarkCount(supabase, bookId),
  })
}

// 저장 해제
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)

  if (error) {
    console.error('Bookmark delete error:', error)
    return NextResponse.json({ error: '저장 해제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    bookmarked: false,
    count: await getBookmarkCount(supabase, bookId),
  })
}
