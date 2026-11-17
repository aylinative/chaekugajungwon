import type { SupabaseClient } from '@supabase/supabase-js'
import { isYes24Book } from '@/lib/bookSource'

// books 행 만들기·찾기 공용 (2026.11.17)
// ※ 기록 저장(/api/recommend)·기록 수정(/api/posts/[id])·읽고 싶은 책 담기(/api/bookmarks)가 같은 규칙
//   (book_key = ISBN13 → 링크 → 제목)으로 찾으므로, 같은 책이면 한 행에 기록·저장이 모인다.

export interface CatalogBookInput {
  title: string
  author?: string
  publisher?: string
  pubDate?: string
  cover?: string
  link?: string
  isbn13?: string
  isOutOfPrint?: boolean
  description?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DESCRIPTION_MAX = 2000 // 책 소개 저장 상한 — 화면은 2줄 + 더보기(500자)

export function bookKeyOf(b: Pick<CatalogBookInput, 'isbn13' | 'link' | 'title'>): string {
  return b.isbn13 || b.link || b.title
}

function cleanDescription(d: string | undefined): string | null {
  const s = (d ?? '').trim()
  return s ? s.slice(0, DESCRIPTION_MAX) : null
}

// books.description 칸이 아직 없는 DB(data 탭 마이그레이션 전)에서도 저장이 실패하지 않게:
// 칸이 없다는 오류(PGRST204)면 description을 빼고 한 번 더 시도한다.
async function withDescriptionFallback<T>(
  row: Record<string, unknown>,
  run: (row: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { code?: string } | null }>
) {
  const first = await run(row)
  if (first.error?.code === 'PGRST204' && 'description' in row) {
    const rest = { ...row }
    delete rest.description
    return run(rest)
  }
  return first
}

// 새 books 행 insert (description 칸 없으면 빼고)
export async function insertBook(
  supabase: SupabaseClient,
  bookKey: string,
  b: CatalogBookInput & { isBoardBook?: boolean }
) {
  const row: Record<string, unknown> = {
    book_key: bookKey,
    title: b.title,
    author: b.author || null,
    publisher: b.publisher || null,
    published_date: b.pubDate && DATE_RE.test(b.pubDate) ? b.pubDate : null,
    cover_image_url: b.cover || null,
    source_url: b.link || null,
    is_out_of_print: b.isOutOfPrint ?? false,
    is_board_book: b.isBoardBook ?? false,
  }
  const description = cleanDescription(b.description)
  if (description) row.description = description
  return withDescriptionFallback<{ id: string }>(row, (r) =>
    supabase.from('books').insert(r).select('id').single()
  )
}

// 카카오로 저장된 옛 책을 누군가 예스24 검색 결과로 다시 고르면, 그 책 정보를 예스24 것으로 바꾼다
// (표지·링크·소개·절판 여부). 제목·저자는 그대로 — 기존 기록과 책 페이지 제목이 흔들리지 않게.
// 옛 책을 쓰이는 순서대로 자연스럽게 옮기는 경로. 나머지는 data 탭의 순차 보정이 맡는다.
export async function upgradeBookToYes24(
  supabase: SupabaseClient,
  bookId: string,
  existingSourceUrl: string | null,
  b: CatalogBookInput
) {
  if (!isYes24Book(b.link) || isYes24Book(existingSourceUrl)) return
  const row: Record<string, unknown> = {
    source_url: b.link,
    is_out_of_print: b.isOutOfPrint ?? false,
  }
  if (b.cover) row.cover_image_url = b.cover
  const description = cleanDescription(b.description)
  if (description) row.description = description
  const { error } = await withDescriptionFallback<null>(row, (r) =>
    supabase.from('books').update(r).eq('id', bookId)
  )
  if (error) console.error('Book upgrade to yes24 error:', error) // 실패해도 기록·저장은 계속
}

// 찾거나 만들기 (읽고 싶은 책 담기용)
export async function findOrCreateBook(
  supabase: SupabaseClient,
  b: CatalogBookInput
): Promise<{ id: string; bookKey: string } | { error: string }> {
  const bookKey = bookKeyOf(b)
  if (!bookKey) return { error: '책 식별자가 없습니다.' }

  const lookup = async () =>
    supabase.from('books').select('id, source_url').eq('book_key', bookKey).maybeSingle()

  const { data: existing, error: lookupError } = await lookup()
  if (lookupError) return { error: '책 정보 조회에 실패했습니다.' }
  if (existing) {
    const row = existing as { id: string; source_url: string | null }
    await upgradeBookToYes24(supabase, row.id, row.source_url, b)
    return { id: row.id, bookKey }
  }

  const { data: inserted, error: insertError } = await insertBook(supabase, bookKey, b)
  if (inserted) return { id: inserted.id, bookKey }

  // 같은 순간 다른 사람이 같은 책을 먼저 만든 경우(book_key UNIQUE 충돌) — 다시 찾는다
  if (insertError?.code === '23505') {
    const { data: again } = await lookup()
    if (again) return { id: (again as { id: string }).id, bookKey }
  }
  console.error('Book insert error:', insertError)
  return { error: '책 정보 저장에 실패했습니다.' }
}
