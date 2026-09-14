import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'
import TagManager, { type AdminTag } from '@/components/admin/TagManager'

export const metadata: Metadata = { title: '주제 태그 관리 | 책육아정원' }

export default async function AdminTagsPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 운영자 전용 — 아니면 홈으로
  if (!user || !(await getIsOperator(supabase, user.id))) {
    redirect('/')
  }

  const [{ data }, { data: tagLinks }] = await Promise.all([
    supabase
      .from('operator_tags')
      .select('id, name, tag_category, is_active, sort_order')
      .order('sort_order', { ascending: true }),
    // 태그별 사용 수(연결된 기록 수) — post_tags의 tag_id를 집계
    supabase.from('post_tags').select('tag_id').not('tag_id', 'is', null),
  ])

  const useCount = new Map<string, number>()
  for (const row of (tagLinks as { tag_id: string }[] | null) ?? []) {
    useCount.set(row.tag_id, (useCount.get(row.tag_id) ?? 0) + 1)
  }

  const tags = ((data as Omit<AdminTag, 'uses'>[] | null) ?? []).map((t) => ({
    ...t,
    uses: useCount.get(t.id) ?? 0,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="text-base font-semibold text-text">주제 태그 관리</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        <p className="mb-4 px-1 text-xs text-text/50">
          삭제 대신 <b>비활성</b>으로 숨겨요(히스토리 보존). 기록 폼·홈 필터에는 활성 태그만 나와요.
        </p>
        <TagManager tags={tags} />
      </main>

      <BottomTabBar />
    </div>
  )
}
