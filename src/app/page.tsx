import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getFeedData } from '@/lib/feed'
import { getMonths } from '@/lib/age'
import { getGroupValueByMonths } from '@/lib/groups'
import FeedHeader from '@/components/FeedHeader'
import BottomTabBar from '@/components/BottomTabBar'
import TopicFilterBar from '@/components/feed/TopicFilterBar'
import GroupSection from '@/components/feed/GroupSection'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import FeedSections from '@/components/feed/FeedSections'

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
        <div className="flex w-full max-w-[260px] flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-512.png" alt="책육아정원 로고" width={160} height={160} className="h-40 w-40" />
            <h1 className="text-2xl font-bold text-main">책육아정원</h1>
            <p className="text-sm text-text/60">그림책 추천 커뮤니티</p>
          </div>
          <a
            href="/api/auth/kakao"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 font-medium text-[#191919] transition-colors hover:bg-[#F5DC00]"
          >
            카카오로 시작하기
          </a>
        </div>
      </main>
    )
  }

  // 첫 기록 게이트(11.4): 기록 0건이면 피드 대신 첫 기록 화면으로.
  // 이 서비스의 핵심은 추천 기록이 쌓이는 것 — 모든 유저는 1건 쓰고 시작한다.
  const { count: myPostCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((myPostCount ?? 0) === 0) {
    redirect('/recommend/create?first=1')
  }

  // 로그인 후: 홈 피드
  const { operatorTags, sections } = await getFeedData(supabase, tag, user.id)
  const hasAnyPost = sections.some((s) => s.cards.length > 0)

  // '우리 아이 기준' 정렬용: 아이들 현재 시기 value (첫째=생일 오름차순 첫 아이, 중복 제거)
  const { data: childRows } = await supabase
    .from('children')
    .select('birth_date')
    .eq('user_id', user.id)
    .order('birth_date', { ascending: true })
  const childGroups = [
    ...new Set(
      ((childRows as { birth_date: string }[] | null) ?? []).map((c) =>
        getGroupValueByMonths(getMonths(c.birth_date))
      )
    ),
  ]

  const sectionNodes = sections.map((section) => ({
    value: section.value,
    node: <GroupSection key={section.value} section={section} isLoggedIn />,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* 신규 가입자 온보딩 — 홈 첫 진입 1회(localStorage). 로그인 유저 홈에만 노출 */}
      <OnboardingModal />
      <FeedHeader />
      <TopicFilterBar tags={operatorTags} activeTag={tag} />

      <main className="flex-1 pb-4">
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
          <FeedSections sections={sectionNodes} childGroups={childGroups} />
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
