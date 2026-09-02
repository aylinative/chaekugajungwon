'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_SLIDES as SLIDES } from '@/lib/onboardingSlides'
import SlideImage from '@/components/onboarding/SlideImage'

// 신규 가입자 온보딩 5장 캐러셀. 홈 첫 진입 1회 노출(localStorage).
// 슬라이드 콘텐츠·이미지는 /guide(이용 가이드)와 공용 — lib/onboardingSlides 단일 소스.
const STORAGE_KEY = 'chaekugajungwon_onboarding_v1'
const SWIPE_THRESHOLD = 50

export default function OnboardingModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  // localStorage는 클라이언트에서만 — 마운트 후 판정(하이드레이션 안전)
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      // localStorage 접근 불가 환경이면 조용히 무시
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setOpen(false)
  }

  const goCta = () => {
    dismiss()
    router.push('/recommend/create')
  }

  const isLast = index === SLIDES.length - 1

  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX)
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const delta = e.changedTouches[0].clientX - touchStartX
    if (delta > SWIPE_THRESHOLD && index > 0) setIndex((i) => i - 1)
    else if (delta < -SWIPE_THRESHOLD && index < SLIDES.length - 1) setIndex((i) => i + 1)
    setTouchStartX(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      {/* 스와이프를 배너 전체에 적용 — 이미지·글 영역 어디서든 좌우로 넘김 (버튼 탭은 delta≈0이라 정상 동작) */}
      <div
        className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* 이미지 영역 (캐러셀 트랙) + 닫기 */}
        <div className="relative">
          <button
            type="button"
            onClick={dismiss}
            aria-label="닫기"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white"
          >
            ✕
          </button>
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {SLIDES.map((slide) => (
                <div key={slide.image} className="h-[240px] w-full flex-shrink-0">
                  <SlideImage src={slide.image} alt={slide.imageAlt} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 텍스트 영역 */}
        <div className="px-5 pb-5 pt-4">
          <h2 className="min-h-[3.5rem] whitespace-pre-line text-lg font-bold leading-snug text-stone-800">
            {SLIDES[index].title}
          </h2>
          <p className="mt-2 min-h-[5.5rem] text-sm leading-relaxed text-stone-600">
            {SLIDES[index].body}
          </p>

          {/* 닷 인디케이터 */}
          <div className="mt-4 flex justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 슬라이드로 이동`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-stone-700' : 'w-1.5 bg-stone-300'
                }`}
              />
            ))}
          </div>

          {/* 버튼 */}
          <div className="mt-4">
            {isLast ? (
              <button
                type="button"
                onClick={goCta}
                className="w-full rounded-xl bg-point py-3 text-sm font-semibold text-white"
              >
                첫 기록 남기러 가기
              </button>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
                  className="rounded-xl bg-stone-800 px-6 py-2.5 text-sm font-medium text-white"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
