import type { SupabaseClient } from '@supabase/supabase-js'
import { GROUP_LABELS_ORDERED } from '@/lib/groups'

// 책 단위 '추천 시기 분포' 집계.
// likes가 book_id 단위(user당 1행)라 행 수 = 추천자 수. 조인 불필요.
// recommend API(완료 직후 표시)와 /book/[isbn](상시 표시)에서 공용.

export interface BookDistribution {
  votes: Record<string, number> // 한글 라벨 → 추천한 사람 수
  totalVoters: number // 시기를 1개 이상 고른 투표자 수
}

interface LikeRow {
  group_names: string[] | null
}

export async function getBookDistribution(
  supabase: SupabaseClient,
  bookId: string
): Promise<BookDistribution> {
  const { data: likeRows } = await supabase
    .from('likes')
    .select('group_names')
    .eq('book_id', bookId)

  const votes: Record<string, number> = {}
  let totalVoters = 0
  for (const row of (likeRows as LikeRow[] | null) ?? []) {
    const groups = (row.group_names ?? []).filter((g) => GROUP_LABELS_ORDERED.includes(g))
    if (groups.length === 0) continue // 레거시 행(빈 배열)은 시기 집계에서 제외
    totalVoters++
    for (const g of groups) votes[g] = (votes[g] ?? 0) + 1
  }
  return { votes, totalVoters }
}
