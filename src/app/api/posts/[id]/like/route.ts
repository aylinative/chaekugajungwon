import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { GROUP_LABELS_ORDERED } from '@/lib/groups'

// '나도 추천해요' (구 좋아요) — 바텀시트에서 고른 추천 시기(group_names)와 함께 저장.
// body: { group_names: string[] } (한글 라벨, likes CHECK 제약과 동일)
//  - 1개 이상: upsert (재탭 수정 포함)
//  - 0개: 행 삭제 = 추천 해제
// 응답에 책 단위 '추천 시기 분포'를 포함해 완료 직후 바로 보여줄 수 있게 한다 (10.3).

interface LikeRow {
  user_id: string
  group_names: string[] | null
}

// 책 단위 분포: 같은 사람이 같은 책의 여러 기록에 추천해도 1표 (count distinct user, 13.3-(2))
async function getBookDistribution(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  postId: string
) {
  const { data: postRow } = await supabase
    .from('posts')
    .select('book_id')
    .eq('id', postId)
    .maybeSingle()
  const bookId = (postRow as { book_id: string } | null)?.book_id
  if (!bookId) return { votes: {}, totalVoters: 0 }

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const raw = Array.isArray(body?.group_names) ? (body.group_names as unknown[]) : []
  const groupNames = raw.filter(
    (g): g is string => typeof g === 'string' && GROUP_LABELS_ORDERED.includes(g)
  )

  let liked: boolean
  if (groupNames.length === 0) {
    // 시기 0개로 완료 = 추천 해제
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    if (error) {
      console.error('Recommend delete error:', error)
      return NextResponse.json({ error: '추천 해제에 실패했습니다.' }, { status: 500 })
    }
    liked = false
  } else {
    const { error } = await supabase
      .from('likes')
      .upsert(
        { post_id: postId, user_id: user.id, group_names: groupNames },
        { onConflict: 'user_id,post_id' }
      )
    if (error) {
      console.error('Recommend upsert error:', error)
      return NextResponse.json({ error: '추천에 실패했습니다.' }, { status: 500 })
    }
    liked = true
  }

  const [{ count }, distribution] = await Promise.all([
    supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
    getBookDistribution(supabase, postId),
  ])

  return NextResponse.json({
    liked,
    count: count ?? 0,
    groupNames,
    distribution: distribution.votes,
    totalVoters: distribution.totalVoters,
  })
}
