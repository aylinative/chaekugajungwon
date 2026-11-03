'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_SLIDES as SLIDES } from '@/lib/onboardingSlides'
import SlideImage from '@/components/onboarding/SlideImage'

// 신규 가입자 온보딩 5장 캐러셀. 노출 여부는 계정 단위(users.onboarded_at)로 서버가 판단해
// show prop으로 내려준다 — localStorage만으로 판단하면 기존 유저가 새 기기에서 다시 보게 된다.
// localStorage는 같은 기기에서의 즉시 재노출을 막는 보조 가드로만 유지.
// 슬라이드 콘텐츠·이미지는 /guide(이용 가이드)와 공용 — lib/onboardingSlides 단일 소스.
const STORAGE_KEY = 'chaekugajungwon_onboarding_v1'
const SWIPE_THRESHOLD = 50

// preview: 개발 서버 확인용(/?onboarding=preview, 개발에서만) — 기기·계정 기록을 무시하고 열고, 닫아도 기록하지 않음
// firstRecord: 기록 0건인 신규 가입자 — 버튼을 누르면 첫 기록 화면(?first=1)으로, 닫으면 홈 둘러보기(11.4, 의무 아님)
export default function OnboardingModal({
  show,
  preview = false,
  firstRecord = false,
}: {
  show: boolean
  preview?: boolean
  firstRecord?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  // 서버가 노출 대상(show)이라 판단했고, 같은 기기에서 이미 닫지 않았을 때만 연다.
  useEffect(() => {
    if (!show) return
    // 미리보기·기록 0건 신규 가입자는 기기 기록(localStorage)을 무시 — 탈퇴 후 같은 기기 재가입 등에서 안내·첫 기록을 건너뛰지 않게
    if (preview || firstRecord) return setOpen(true)
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      setOpen(true) // localStorage 접근 불가 환경이면 서버 판단만 따른다
    }
  }, [show, preview, firstRecord])

  const FIRST_RECORD_URL = '/recommend/create?first=1'
  // 닫기 = 홈 둘러보기 (첫 기록 의무 폐지 2026.11.03)
  const dismiss = () => {
    if (preview) return setOpen(false)
    markSeen()
    setOpen(false)
  }

  // 같은 기기 즉시 재노출 방지 + 계정 단위 '봤음' 기록(best-effort)
  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setOpen(false)
    // 계정 단위로 '봤음' 기록 — 다른 기기에서도 재노출 안 됨(best-effort)
    return fetch('/api/onboarding', { method: 'POST' }).then(
      () => undefined,
      () => undefined
    )
  }

  const goCta = () => {
    if (preview) return setOpen(false)
    // '봤음' 저장이 끝난 뒤 이동 — 뒤로가기로 홈에 돌아왔을 때 팝업이 다시 뜨지 않게
    markSeen().finally(() => router.push(firstRecord ? FIRST_RECORD_URL : '/recommend/create'))
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
            {/* 마지막 장에만 — 팝업을 닫은 뒤 다시 볼 곳 안내 (모달 전용, /guide 페이지에는 안 나옴) */}
            {isLast && (
              <span className="mt-1 block text-xs text-stone-500">이용가이드는 마이페이지에서 확인 가능해요</span>
            )}
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
