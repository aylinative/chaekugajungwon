import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// 책 제목 검색 (12장) — DB 함수 search_books 사용 (supabase/add_search_function.sql)
// 띄어쓰기 무시 부분 일치('달님안녕'↔'달님 안녕') + pg_trgm 유사도 매칭.
// 기록이 있는 책만, 기록 수 → 추천 수 정렬, 30건 제한 (함수 내 처리).

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('q') ?? ''
  const q = raw.replace(/\s+/g, ' ').trim()
  if (!q) {
    return NextResponse.json({ items: [] })
  }

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('search_books', { search_query: q })

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: '검색에 실패했습니다.' }, { status: 500 })
  }

  interface Row {
    id: string
    book_key: string | null
    title: string | null
    author: string | null
    cover_image_url: string | null
    record_count: number
    recommend_count: number
  }

  const items = ((data as Row[] | null) ?? []).map((b) => ({
    bookId: b.id,
    isbn: b.book_key ?? '',
    title: b.title ?? '(제목 없음)',
    author: b.author,
    cover: b.cover_image_url,
    recordCount: Number(b.record_count),
    recommendCount: Number(b.recommend_count),
  }))

  return NextResponse.json({ items })
}
