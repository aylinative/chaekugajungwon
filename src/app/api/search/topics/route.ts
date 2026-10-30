import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { TOPICS_CACHE_TAG } from '@/lib/cacheTags'
import { getCardsByTag } from '@/lib/feed'

// 홈 검색 '주제로 찾은 책' (docs/taxonomy/DECISIONS.md 15장)
// 검색어가 태그의 검색별칭(search_aliases)과 정확히 같거나(1글자 포함) 별칭의 앞부분이면(2글자 이상)
// 그 태그(주제면 세부 포함)가 달린 책을 태그별로 묶어 돌려준다. 책 목록은 공개 피드 캐시에서 고름.
const MAX_TAGS = 4
const MAX_BOOKS = 20

interface AliasTag {
  slug: string
  name: string
  parentName: string | null
  aliases: string[]
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

const getAliasTags = unstable_cache(
  async (): Promise<AliasTag[]> => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await sb
      .from('operator_tags')
      .select('id, slug, name, parent_id, search_aliases, sort_order')
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    type Row = { id: string; slug: string; name: string; parent_id: string | null; search_aliases: string[] | null }
    const rows = (data ?? []) as Row[]
    const nameById = new Map(rows.map((r) => [r.id, r.name]))
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      parentName: r.parent_id ? nameById.get(r.parent_id) ?? null : null,
      aliases: [r.name, ...(r.search_aliases ?? [])].map(norm),
    }))
  },
  ['search-alias-tags-v1'],
  { revalidate: 86400, tags: [TOPICS_CACHE_TAG] }
)

export async function GET(request: NextRequest) {
  const q = norm(request.nextUrl.searchParams.get('q') ?? '')
  if (!q) return NextResponse.json({ groups: [] })
  try {
    const tags = await getAliasTags()
    const hits = tags
      .map((t) => {
        const exact = t.aliases.includes(q)
        const prefix = !exact && [...q].length >= 2 && t.aliases.some((a) => a.startsWith(q))
        return { t, score: exact ? 0 : prefix ? 1 : -1 }
      })
      .filter((h) => h.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_TAGS)

    const groups = []
    for (const { t } of hits) {
      const cards = await getCardsByTag(t.slug)
      if (cards.length === 0) continue
      groups.push({
        slug: t.slug,
        label: t.parentName ? `${t.parentName} › ${t.name}` : t.name,
        books: cards.slice(0, MAX_BOOKS).map((c) => ({
          bookId: c.bookId,
          isbn: c.isbn,
          title: c.title,
          cover: c.cover,
          recordCount: c.recordCount,
        })),
      })
    }
    return NextResponse.json({ groups })
  } catch (error) {
    // 개편 전 DB(search_aliases 없음) 등 — 보조 섹션이라 조용히 비운다
    console.error('Topic search error:', error)
    return NextResponse.json({ groups: [] })
  }
}
