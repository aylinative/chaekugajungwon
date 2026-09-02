import type { Metadata } from 'next'
import Link from 'next/link'
import BottomTabBar from '@/components/BottomTabBar'
import SlideImage from '@/components/onboarding/SlideImage'
import { ONBOARDING_SLIDES } from '@/lib/onboardingSlides'

export const metadata: Metadata = { title: '이용 가이드 | 책육아정원' }

// 이용 가이드 — 온보딩 모달과 같은 내용을 언제든 다시 보는 상설 페이지(모달 못 본 사람 대비).
// 콘텐츠·이미지는 lib/onboardingSlides 공용(스크린샷 교체 시 한 곳만).
export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="flex-1 text-base font-semibold text-text">이용 가이드</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-4 pb-24 pt-5">
        <p className="text-sm leading-relaxed text-text/60">
          책육아정원은 아이와 함께 읽은 그림책을 기록하고, 그 기록이 모여 다른 양육자에게
          추천이 되는 커뮤니티예요. 아래에서 사용법을 확인하세요.
        </p>

        {ONBOARDING_SLIDES.map((s) => (
          <section key={s.image} className="space-y-3">
            <div className="h-[200px] w-full overflow-hidden rounded-2xl bg-stone-100">
              <SlideImage src={s.image} alt={s.imageAlt} className="h-full w-full object-cover" />
            </div>
            <h2 className="whitespace-pre-line text-lg font-bold leading-snug text-text">
              {s.title}
            </h2>
            <p className="text-sm leading-relaxed text-text/70">{s.body}</p>
          </section>
        ))}

        <Link
          href="/recommend/create"
          className="block rounded-xl bg-point py-3 text-center text-sm font-semibold text-white"
        >
          기록하러 가기
        </Link>
      </main>

      <BottomTabBar />
    </div>
  )
}
