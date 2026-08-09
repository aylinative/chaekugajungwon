import type { SupabaseClient } from '@supabase/supabase-js'
import { GROUP_LABELS_ORDERED } from '@/lib/groups'

// 책 단위 '추천 시기 분포' 집계.
// 추천 시기 = ① '나도 추천해요'(likes.group_names) + ② 기록 시 고른 시기(post_groups) 의 합집합.
//   기록한 사람도 "이 시기 아이가 읽으면 좋다"고 판단한 추천자이므로 함께 센다.
//   같은 사람이 기록과 추천을 둘 다 했어도 유저별 합집합으로 1명만 카운트(중복 제거).
// recommend API(완료 직후 표시)와 /book/[isbn](상시 표시)에서 공용.

export interface BookDistribution {
  votes: Record<string, number> // 한글 라벨 → 추천한 사람 수
  totalVoters: number // 시기를 1개 이상 고른 사람 수
}

interface LikeRow {
  user_id: string
  group_names: string[] | null
}

interface PostRow {
  user_id: string
  post_groups: { group_name: string }[] | null
}

export async function getBookDistribution(
  supabase: SupabaseClient,
  bookId: string
): Promise<BookDistribution> {
  const [{ data: likeRows }, { data: postRows }] = await Promise.all([
    supabase.from('likes').select('user_id, group_names').eq('book_id', bookId),
    supabase.from('posts').select('user_id, post_groups ( group_name )').eq('book_id', bookId),
  ])

  // 유저별 시기 집합(합집합). 추천·기록·다중 기록의 중복을 모두 제거한다.
  const byUser = new Map<string, Set<string>>()
  const addGroups = (userId: string, groups: string[]) => {
    const valid = groups.filter((g) => GROUP_LABELS_ORDERED.includes(g))
    if (valid.length === 0) return
    const set = byUser.get(userId) ?? new Set<string>()
    valid.forEach((g) => set.add(g))
    byUser.set(userId, set)
  }

  for (const l of (likeRows as LikeRow[] | null) ?? []) {
    addGroups(l.user_id, l.group_names ?? [])
  }
  for (const p of (postRows as unknown as PostRow[] | null) ?? []) {
    addGroups(p.user_id, (p.post_groups ?? []).map((g) => g.group_name))
  }

  const votes: Record<string, number> = {}
  for (const set of byUser.values()) {
    for (const g of set) votes[g] = (votes[g] ?? 0) + 1
  }
  return { votes, totalVoters: byUser.size }
}
