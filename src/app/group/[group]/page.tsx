import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { RECOMMEND_GROUPS, AGE_LABEL_FULL } from '@/lib/groups'
import { getGroupCards } from '@/lib/feed'
import BookCardItem from '@/components/feed/BookCard'
import BottomTabBar from '@/components/BottomTabBar'

const BADGE_BY_VALUE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.value, g.selectedClass])
)
const EMOJI_BY_VALUE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.value, g.emoji])
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ group: string }>
}): Promise<Metadata> {
  const { group } = await params
  const g = RECOMMEND_GROUPS.find((x) => x.value === group)
  if (!g) return { title: '그림책 추천 | 책육아정원' }
  return {
    title: `${g.label}(${AGE_LABEL_FULL[g.label] ?? ''}) 그림책 추천 | 책육아정원`,
  }
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ group: string }>
}) {
  const { group } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 첫 기록 게이트(11.4): 기록 0건이면 첫 기록 화면으로
  if (user) {
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) === 0) {
      redirect('/recommend/create?first=1')
    }
  }

  const data = await getGroupCards(supabase, group, user?.id)
  if (!data) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span
          aria-label={data.label}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-base ${
            BADGE_BY_VALUE[data.value] ?? 'bg-surface-muted'
          }`}
        >
          {EMOJI_BY_VALUE[data.value] ?? data.label}
        </span>
        <span className="text-base font-semibold text-text">{data.label}</span>
        <span className="text-xs text-text/50">{data.ageLabel}</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        {data.cards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-3xl">🌱</span>
            <p className="text-sm text-text/60">
              이 시기에 추천된 그림책이 아직 없어요.
            </p>
            <Link
              href="/recommend/create"
              className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white"
            >
              기록하기
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-text/40">총 {data.cards.length}권</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {data.cards.map((card) => (
                <BookCardItem
                  key={card.bookId}
                  card={card}
                  isLoggedIn={Boolean(user)}
                  fullWidth
                />
              ))}
            </div>
          </>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
