import { createServerSupabase } from '@/lib/supabase-server'
import { getFeedData } from '@/lib/feed'
import FeedHeader from '@/components/FeedHeader'
import BottomTabBar from '@/components/BottomTabBar'
import TopicFilterBar from '@/components/feed/TopicFilterBar'
import GroupSection from '@/components/feed/GroupSection'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const { tag } = await searchParams
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인 전: 랜딩/로그인 화면
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-8 px-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">🌿</span>
            <h1 className="text-2xl font-bold text-main">책육아정원</h1>
            <p className="text-sm text-text/60">그림책 추천 커뮤니티</p>
          </div>
          <a
            href="/api/auth/kakao"
            className="flex items-center gap-3 rounded-xl bg-[#FEE500] px-6 py-3 font-medium text-[#191919] transition-colors hover:bg-[#F5DC00]"
          >
            <span>카카오로 시작하기</span>
          </a>
        </div>
      </main>
    )
  }

  // 로그인 후: 홈 피드
  const { operatorTags, sections } = await getFeedData(supabase, tag, user.id)
  const hasAnyPost = sections.some((s) => s.cards.length > 0)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <FeedHeader />
      <TopicFilterBar tags={operatorTags} activeTag={tag} />

      <main className="flex-1 divide-y divide-black/5 pb-4">
        {!hasAnyPost ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <span className="text-3xl">🌱</span>
            <p className="text-sm text-text/60">
              {tag
                ? `'#${tag}' 태그가 붙은 추천이 아직 없어요.`
                : '아직 추천된 그림책이 없어요. 첫 기록을 남겨보세요!'}
            </p>
            <a
              href="/recommend/create"
              className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white"
            >
              기록하기
            </a>
          </div>
        ) : (
          sections.map((section) => (
            <GroupSection key={section.value} section={section} isLoggedIn />
          ))
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
