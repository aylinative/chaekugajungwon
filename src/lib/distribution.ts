import type { SupabaseClient } from '@supabase/supabase-js'
import { GROUP_LABELS_ORDERED } from '@/lib/groups'

// 책 단위 '추천 시기 분포' 집계 (CLAUDE.md 13.3 주요 쿼리 패턴 (2)의 의미를 JS로 구현)
// 같은 사람이 같은 책의 여러 기록에 추천해도 1표 (count distinct user_id).
// like API(완료 직후 표시)와 /book/[isbn](상시 표시)에서 공용.

export interface BookDistribution {
  votes: Record<string, number> // 한글 라벨 → 추천한 사람 수
  totalVoters: number // 시기를 1개 이상 고른 투표자 수
}

interface LikeRow {
  user_id: string
  group_names: string[] | null
}

export async function getBookDistribution(
  supabase: SupabaseClient,
  bookId: string
): Promise<BookDistribution> {
  const { data: postIds } = await supabase.from('posts').select('id').eq('book_id', bookId)
  const ids = ((postIds as { id: string }[] | null) ?? []).map((p) => p.id)
  if (ids.length === 0) return { votes: {}, totalVoters: 0 }

  const { data: likeRows } = await supabase
    .from('likes')
    .select('user_id, group_names')
    .in('post_id', ids)

  // 유저별 시기 집합으로 합친 뒤(기록 여러 개 추천 중복 제거) 시기별 유저 수 집계
  const byUser = new Map<string, Set<string>>()
  for (const row of (likeRows as LikeRow[] | null) ?? []) {
    const groups = (row.group_names ?? []).filter((g) => GROUP_LABELS_ORDERED.includes(g))
    if (groups.length === 0) continue // 레거시 행(빈 배열)은 시기 집계에서 제외
    const set = byUser.get(row.user_id) ?? new Set<string>()
    groups.forEach((g) => set.add(g))
    byUser.set(row.user_id, set)
  }

  const votes: Record<string, number> = {}
  for (const set of byUser.values()) {
    for (const g of set) votes[g] = (votes[g] ?? 0) + 1
  }
  return { votes, totalVoters: byUser.size }
}

export async function getBookDistributionByPostId(
  supabase: SupabaseClient,
  postId: string
): Promise<BookDistribution> {
  const { data: postRow } = await supabase
    .from('posts')
    .select('book_id')
    .eq('id', postId)
    .maybeSingle()
  const bookId = (postRow as { book_id: string } | null)?.book_id
  if (!bookId) return { votes: {}, totalVoters: 0 }
  return getBookDistribution(supabase, bookId)
}
