import { createServerSupabase } from '@/lib/supabase-server'
import { getFeedData } from '@/lib/feed'
import { getMonths } from '@/lib/age'
import { getGroupValueByMonths } from '@/lib/groups'
import FeedHeader from '@/components/FeedHeader'
import BottomTabBar from '@/components/BottomTabBar'
import TopicFilterBar from '@/components/feed/TopicFilterBar'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import { LoginPromptFromUrl } from '@/components/auth/LoginSheet'
import FeedSections from '@/components/feed/FeedSections'
import type { Metadata } from 'next'

// 홈 canonical을 실서비스 도메인 루트로 고정 (베타 도메인 중복 색인 방지, 브랜드 검색 대응)
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; cat?: string; onboarding?: string; withdrawn?: string; login?: string; next?: string }>
}) {
  const { tag, cat, onboarding, withdrawn, login, next } = await searchParams
  // 개발 서버에서만: /?onboarding=preview 로 온보딩 팝업 미리보기 (운영에서는 무시)
  const previewOnboarding = process.env.NODE_ENV === 'development' && onboarding === 'preview'
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인하지 않아도 홈 피드를 보여 준다 (2026.11.04 운영자 — 둘러보기는 로그인 없이, 기록·추천·저장·아이 기준 보기만 로그인).
  // 로그인한 사람만: 안내 팝업 판단(users.onboarded_at — 계정 단위 1회, 조회 실패 시 안전하게 미노출) + '우리 아이 시기 먼저'용 아이 시기
  let showOnboarding = false
  let needsFirstRecord = false
  let childGroups: string[] = []
  if (user) {
    const [{ data: me, error: meError }, { count: myPostCount }, { data: childRows }] = await Promise.all([
      supabase.from('users').select('onboarded_at').eq('id', user.id).maybeSingle(),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('children').select('birth_date').eq('user_id', user.id).order('birth_date', { ascending: true }),
    ])
    showOnboarding = !meError && !(me as { onboarded_at: string | null } | null)?.onboarded_at
    // 첫 기록은 권유만 (11.4) — 기록 0건이면 안내 팝업의 버튼이 첫 기록 화면으로
    needsFirstRecord = (myPostCount ?? 0) === 0
    // 아이들 현재 시기 value (첫째=생일 오름차순 첫 아이, 중복 제거)
    childGroups = [
      ...new Set(
        ((childRows as { birth_date: string }[] | null) ?? []).map((c) => getGroupValueByMonths(getMonths(c.birth_date)))
      ),
    ]
  }

  const { operatorTags, sections } = await getFeedData(supabase, { tag, cat }, user?.id)
  const filterLabel = tag ? operatorTags.find((t) => t.slug === tag || t.name === tag)?.name ?? tag : cat
  const hasAnyPost = sections.some((s) => s.cards.length > 0)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* 신규 가입자 온보딩 — 계정당 1회(users.onboarded_at). 새 기기에서도 재노출 안 됨 */}
      {user ? (
        <OnboardingModal
          show={showOnboarding || previewOnboarding}
          preview={previewOnboarding}
          firstRecord={needsFirstRecord}
        />
      ) : (
        // 첫 방문 게스트 — 이 기기에서 처음일 때 한 번 (홈에서만: 검색으로 들어온 책 페이지에 팝업을 띄우면
        // 구글 모바일 '방해되는 전면 팝업' 감점 대상이라)
        <OnboardingModal show preview={previewOnboarding} guest />
      )}
      {/* 로그인이 필요한 화면(기록하기·마이)에 바로 들어온 게스트: /?login=record&next=… → 로그인 시트 */}
      <LoginPromptFromUrl reason={login} next={next} />
      <FeedHeader isLoggedIn={Boolean(user)} />
      {withdrawn === '1' && (
        <p className="mx-4 mt-3 rounded-xl bg-surface-muted px-4 py-2.5 text-center text-xs text-text/70">
          탈퇴가 완료됐어요. 그동안 함께해 주셔서 고마워요.
        </p>
      )}
      <TopicFilterBar tags={operatorTags} value={{ tag, cat }} />

      <main className="flex-1 pb-4">
        {!hasAnyPost ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <span className="text-3xl">🌱</span>
            <p className="text-sm text-text/60">
              {filterLabel
                ? `'${filterLabel}' 주제의 추천이 아직 없어요.`
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
          <FeedSections sections={sections} childGroups={childGroups} isLoggedIn={Boolean(user)} />
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
