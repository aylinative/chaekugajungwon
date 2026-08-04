import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// 책 제목 검색 (12장) — 검색 대상은 기록이 쌓인 우리 DB의 books.
// 결과는 책 단위(기록 수·추천 수 포함) → /book/[isbn]으로 연결.

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('q') ?? ''
  const q = raw.replace(/\s+/g, ' ').trim()
  if (!q) {
    return NextResponse.json({ items: [] })
  }

  const supabase = await createServerSupabase()
  // ilike 패턴 문자는 이스케이프 (검색어에 %·_가 들어와도 문자 그대로 취급)
  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`

  const { data, error } = await supabase
    .from('books')
    .select(
      'id, aladin_item_id, title, author, cover_image_url, posts ( count ), likes ( count )'
    )
    .ilike('title', pattern)
    .limit(30)

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: '검색에 실패했습니다.' }, { status: 500 })
  }

  interface Row {
    id: string
    aladin_item_id: string | null
    title: string | null
    author: string | null
    cover_image_url: string | null
    posts: { count: number }[] | null
    likes: { count: number }[] | null
  }

  const items = ((data as unknown as Row[] | null) ?? [])
    .map((b) => ({
      bookId: b.id,
      isbn: b.aladin_item_id ?? '',
      title: b.title ?? '(제목 없음)',
      author: b.author,
      cover: b.cover_image_url,
      recordCount: b.posts?.[0]?.count ?? 0,
      recommendCount: b.likes?.[0]?.count ?? 0,
    }))
    // 기록이 있는 책만 (롤백 등으로 남은 고아 책 제외)
    .filter((b) => b.recordCount > 0)
    .sort((a, b) => b.recordCount - a.recordCount || b.recommendCount - a.recommendCount)

  return NextResponse.json({ items })
}
