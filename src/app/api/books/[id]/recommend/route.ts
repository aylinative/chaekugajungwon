import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { GROUP_LABELS_ORDERED } from '@/lib/groups'
import { getBookDistribution } from '@/lib/distribution'

// '나도 추천해요' — 책 단위 (2026.08: post 단위에서 전환).
// "나도 이 책을 이 시기 아이에게 추천한다"는 책·시기에 대한 판단이므로 book_id에 저장.
// body: { group_names: string[] } (한글 라벨, likes CHECK 제약과 동일)
//  - 1개 이상: upsert (재탭 수정 포함)
//  - 0개: 행 삭제 = 추천 해제
// 응답에 분포를 포함해 완료 직후 바로 보여줄 수 있게 한다 (10.3).

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params
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
      .eq('book_id', bookId)
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
        { book_id: bookId, user_id: user.id, group_names: groupNames },
        { onConflict: 'user_id,book_id' }
      )
    if (error) {
      console.error('Recommend upsert error:', error)
      return NextResponse.json({ error: '추천에 실패했습니다.' }, { status: 500 })
    }
    liked = true
  }

  const [{ count }, distribution] = await Promise.all([
    supabase.from('likes').select('*', { count: 'exact', head: true }).eq('book_id', bookId),
    getBookDistribution(supabase, bookId),
  ])

  return NextResponse.json({
    liked,
    count: count ?? 0, // 이 책을 추천한 사람 수 (user당 1행)
    groupNames,
    distribution: distribution.votes,
    totalVoters: distribution.totalVoters,
  })
}
