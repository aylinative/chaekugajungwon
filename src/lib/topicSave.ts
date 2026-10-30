import type { SupabaseClient } from '@supabase/supabase-js'

// 기록 저장·수정 API 공용: 화면에서 고른 주제(slug + 출처)를 post_tags 행으로 바꾼다. (서버 전용)
// - 활성 태그만 받는다. 목록에 없는 slug는 버린다 (직접 입력 태그 없음 — CLAUDE.md 8.2)
// - 세부를 고르면 상위 주제도 함께 저장 (주제 필터에서 빠지지 않게)
// - 같은 태그가 여러 번 오면 마지막 출처

export type SaveSource = 'recommend' | 'others' | 'all'
const SOURCES: SaveSource[] = ['recommend', 'others', 'all']

export interface TagPayload {
  slug: string
  source?: string
}

export async function resolveTagPicks(
  supabase: SupabaseClient,
  picks: unknown
): Promise<{ rows: { tag_id: string; source: SaveSource }[]; error: unknown }> {
  const list = (Array.isArray(picks) ? picks : []).filter(
    (p): p is TagPayload => !!p && typeof (p as TagPayload).slug === 'string'
  )
  if (list.length === 0) return { rows: [], error: null }

  const { data, error } = await supabase
    .from('operator_tags')
    .select('id, slug, parent_id')
    .eq('is_active', true)
  if (error) return { rows: [], error }
  const bySlug = new Map(
    ((data ?? []) as { id: string; slug: string; parent_id: string | null }[]).map((t) => [t.slug, t])
  )

  const out = new Map<string, SaveSource>()
  for (const p of list) {
    const tag = bySlug.get(p.slug)
    if (!tag) continue
    const source: SaveSource = SOURCES.includes(p.source as SaveSource) ? (p.source as SaveSource) : 'all'
    if (tag.parent_id && !out.has(tag.parent_id)) out.set(tag.parent_id, source)
    out.set(tag.id, source)
  }
  return { rows: [...out].map(([tag_id, source]) => ({ tag_id, source })), error: null }
}
