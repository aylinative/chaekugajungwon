import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'
import TagManager, { type AdminTag } from '@/components/admin/TagManager'
import SuggestionList, { type SuggestionGroup } from '@/components/admin/SuggestionList'

export const metadata: Metadata = { title: '주제 태그 관리 | 책육아정원' }

// 출처 통계 기간 시작 (최근 30일)
const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

const SOURCE_LABEL: Record<string, string> = { recommend: '추천 주제', others: '다른 양육자 줄', all: '주제 더보기' }

export default async function AdminTagsPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 운영자 전용 — 아니면 홈으로
  if (!user || !(await getIsOperator(supabase, user.id))) {
    redirect('/')
  }

  const since = thirtyDaysAgo()
  const [{ data }, { data: tagLinks }, { data: recent }, { data: suggestions }] = await Promise.all([
    supabase
      .from('operator_tags')
      .select('id, slug, name, level, parent_id, tag_category, is_active, sort_order, chip_example, search_aliases, intro_keywords, intro_excludes')
      .order('sort_order', { ascending: true }),
    // 태그별 사용 수(연결된 기록 수)
    supabase.from('post_tags').select('tag_id').not('tag_id', 'is', null),
    // 출처 통계: 최근 30일 기록에 새로 저장된 태그의 고른 경로
    supabase
      .from('post_tags')
      .select('source, posts!inner(created_at)')
      .in('source', ['recommend', 'others', 'all'])
      .gte('posts.created_at', since),
    supabase
      .from('topic_suggestions')
      .select('text, normalized, status, created_at, books(title)')
      .order('created_at', { ascending: true }),
  ])

  const useCount = new Map<string, number>()
  for (const row of (tagLinks as { tag_id: string }[] | null) ?? []) {
    useCount.set(row.tag_id, (useCount.get(row.tag_id) ?? 0) + 1)
  }
  const tags: AdminTag[] = ((data as Omit<AdminTag, 'uses'>[] | null) ?? []).map((t) => ({
    ...t,
    search_aliases: t.search_aliases ?? [],
    intro_keywords: t.intro_keywords ?? [],
    intro_excludes: t.intro_excludes ?? [],
    uses: useCount.get(t.id) ?? 0,
  }))

  const sourceCount: Record<string, number> = { recommend: 0, others: 0, all: 0 }
  for (const r of (recent as { source: string }[] | null) ?? []) sourceCount[r.source] = (sourceCount[r.source] ?? 0) + 1
  const sourceTotal = Object.values(sourceCount).reduce((a, b) => a + b, 0)

  // 제안: 같은 normalized끼리 묶음 (대표 = 가장 먼저 들어온 원문), 많이 제안된 순
  const byNorm = new Map<string, SuggestionGroup>()
  type SRow = { text: string; normalized: string; status: SuggestionGroup['status']; created_at: string; books: { title: string | null } | null }
  for (const s of (suggestions as unknown as SRow[] | null) ?? []) {
    const g = byNorm.get(s.normalized) ?? { normalized: s.normalized, text: s.text, count: 0, lastAt: s.created_at, books: [], status: s.status }
    g.count += 1
    g.lastAt = s.created_at
    g.status = s.status
    const title = s.books?.title
    if (title && !g.books.includes(title) && g.books.length < 3) g.books.push(title)
    byNorm.set(s.normalized, g)
  }
  const suggestionGroups = [...byNorm.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="text-base font-semibold text-text">주제 태그 관리</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pb-10 pt-4">
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">고른 경로 (최근 30일)</h2>
          {sourceTotal === 0 ? (
            <p className="rounded-xl bg-surface px-3 py-3 text-xs text-text/40">아직 데이터가 없어요</p>
          ) : (
            <div className="rounded-xl bg-surface px-3 py-2">
              {Object.entries(sourceCount).map(([k, v]) => (
                <p key={k} className="flex justify-between py-0.5 text-xs text-text/70">
                  <span>{SOURCE_LABEL[k]}</span>
                  <span>
                    {v}건 · {Math.round((v / sourceTotal) * 100)}%
                  </span>
                </p>
              ))}
              <p className="mt-1 text-[11px] text-text/40">
                &lsquo;다른 양육자 줄&rsquo; 비율이 지나치게 높으면 먼저 기록한 사람의 선택을 따라가는(쏠림) 신호예요.
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">사용자 제안</h2>
          <SuggestionList groups={suggestionGroups} />
        </section>

        <section>
          <h2 className="mb-1 px-1 text-sm font-semibold text-text">주제 태그</h2>
          <p className="mb-3 px-1 text-xs text-text/50">
            삭제 대신 <b>숨김</b>으로 감춰요(기존 기록 연결은 유지). 기록하기·홈 필터에는 보이는 태그만 나와요.
          </p>
          <TagManager tags={tags} />
        </section>
      </main>

      <BottomTabBar />
    </div>
  )
}
