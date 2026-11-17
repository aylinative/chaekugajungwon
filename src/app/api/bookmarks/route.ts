import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'
import { findOrCreateBook, type CatalogBookInput } from '@/lib/bookUpsert'

// 검색 결과의 책을 '아이와 읽고 싶은 책'에 담는다 (2026.11.17).
// 아직 아무도 기록하지 않아 books 행이 없는 책도 담을 수 있게, 책을 찾거나 만든 뒤 저장한다.
// (이미 DB에 있는 책의 저장/해제는 /api/books/[id]/bookmark — 이 API는 '검색 결과에서 담기' 전용)
// 규칙은 기존 저장과 같다: 이미 기록한 책은 담을 수 없고(409), 기록하면 자동으로 빠진다(/api/recommend).
export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let book: CatalogBookInput | undefined
  try {
    book = (await request.json())?.book
  } catch {
    // 아래에서 400
  }
  const title = typeof book?.title === 'string' ? book.title.trim() : ''
  if (!book || !title || title.length > 300) {
    return NextResponse.json({ error: '책 정보가 올바르지 않습니다.' }, { status: 400 })
  }

  const found = await findOrCreateBook(supabase, { ...book, title })
  if ('error' in found) {
    return NextResponse.json({ error: found.error }, { status: 500 })
  }

  // 이미 기록한 책(삭제한 기록 제외)은 '읽고 싶은 책'이 아니다
  const { data: myPost } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', found.id)
    .is('hidden_at', null)
    .limit(1)
    .maybeSingle()
  if (myPost) {
    return NextResponse.json(
      { error: '이미 아이와 함께 읽은 책이에요.', alreadyRecorded: true },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('bookmarks')
    .upsert(
      { user_id: user.id, book_id: found.id },
      { onConflict: 'user_id,book_id', ignoreDuplicates: true }
    )
  if (error) {
    console.error('Bookmark insert error:', error)
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }

  // 마이페이지·책 페이지의 저장 상태 반영 (기존 저장 API와 같은 처리 — 피드 캐시는 건드리지 않음)
  revalidatePath('/', 'layout')
  return NextResponse.json({ bookmarked: true, bookId: found.id, bookKey: found.bookKey })
}
