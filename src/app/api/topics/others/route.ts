import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const MIN_PICKS = 2 // 이 수 이상의 기록에서 고른 주제만

// '다른 양육자들은 이런 주제도 골랐어요' — 같은 책의 다른 기록에 달린 주제 (많이 고른 순).
// 내 기록·숨김 기록·숨김 태그는 뺀다. 인원수는 돌려주지 않는다(쏠림 방지 — DECISIONS 8장).
// 2026.10.30 운영자: 2명 이상(기록 2건 이상)이 고른 주제만 — 한 사람의 선택이 정답처럼 보이지 않게. 최대 3개는 화면에서.
// 화면은 사용자가 하나 이상 고른 뒤에만 이 목록을 보여준다.
export async function GET(request: NextRequest) {
  const bookKey = request.nextUrl.searchParams.get('book_key')?.trim()
  if (!bookKey) return NextResponse.json({ slugs: [] })

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: book } = await supabase.from('books').select('id').eq('book_key', bookKey).maybeSingle()
  if (!book) return NextResponse.json({ slugs: [] })

  let q = supabase
    .from('posts')
    .select('id, post_tags ( operator_tags ( slug, level, is_active, parent_id ) )')
    .eq('book_id', (book as { id: string }).id)
    .is('hidden_at', null)
  if (user) q = q.neq('user_id', user.id)
  const { data, error } = await q
  if (error) {
    // 개편 전 DB(slug 컬럼 없음) 등 — 이 줄은 보조 기능이라 조용히 비운다
    return NextResponse.json({ slugs: [] })
  }

  type Row = { post_tags: { operator_tags: { slug: string | null; level: string; is_active: boolean } | null }[] }
  const count = new Map<string, number>()
  for (const post of (data ?? []) as unknown as Row[]) {
    const seen = new Set<string>()
    for (const pt of post.post_tags ?? []) {
      const t = pt.operator_tags
      if (!t?.slug || !t.is_active || seen.has(t.slug)) continue
      seen.add(t.slug)
      count.set(t.slug, (count.get(t.slug) ?? 0) + 1)
    }
  }
  const slugs = [...count.entries()]
    .filter(([, n]) => n >= MIN_PICKS)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s)
  return NextResponse.json({ slugs })
}
