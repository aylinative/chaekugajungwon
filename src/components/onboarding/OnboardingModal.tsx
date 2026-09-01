'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// 신규 가입자 온보딩 5장 캐러셀. 홈 첫 진입 1회 노출(localStorage).
// 이미지는 아직 없을 수 있어(배포 전 스크린샷 교체) 로딩 실패 시 회색 placeholder로 폴백.
const STORAGE_KEY = 'chaekugajungwon_onboarding_v1'
const SWIPE_THRESHOLD = 50

interface Slide {
  image: string
  imageAlt: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    image: '/onboarding/01-home.png',
    imageAlt: '책육아정원 홈 피드',
    title: '당신의 기록이\n다른 아이의 좋은 책이 돼요',
    body: "아이와 함께 읽은 그림책을 기록하면, 그 기록이 모여 다른 양육자에게 'N개월에 좋았던 책' 추천이 됩니다. 나를 위한 육아일기이자, 모두를 위한 추천이에요.",
  },
  {
    image: '/onboarding/02-groups.png',
    imageAlt: '시기별 섹션',
    title: '아이 시기에 꼭 맞는 그림책',
    body: '씨앗🫘·새싹🌱·꽃잎🌸·열매🍎·나무🌳·어른👩‍👦 — 아이가 자라는 6개 시기로 책을 나눠요. 우리 아이가 지금 어떤 시기인지, 그 시기 아이들이 어떤 책을 좋아했는지 한눈에 볼 수 있어요.',
  },
  {
    image: '/onboarding/03-form.png',
    imageAlt: '기록하기 폼',
    title: '기록은 이렇게 남겨요',
    body: '책 제목으로 검색해 고르고 → 읽어주면 좋은 시기를 선택하고 → 우리 아이 반응을 남기면 끝. 주제 태그도 달면 같은 주제 책을 찾는 사람들에게 더 잘 보여요.',
  },
  {
    image: '/onboarding/04-reaction.png',
    imageAlt: '반응 선택 UI',
    title: '솔직한 반응이 가장 큰 힘이에요',
    body: '자꾸 꺼내봐요 / 재밌어했어요 / 그냥 봤어요 — 있는 그대로 남겨주세요. 솔직한 반응이 쌓여야 다른 양육자에게 진짜 도움이 될거에요.',
  },
  {
    image: '/onboarding/05-cards.png',
    imageAlt: '홈 피드 카드들',
    title: '마음에 든 책은 추천하고 저장해요',
    body: "다른 기록에 '나도 추천해요'를 누르면 추천 시기가 쌓이고, 아직 안 읽은 책은 '저장'해 두었다가 나중에 아이와 읽어요. 검색으로 원하는 책의 기록도 찾아볼 수 있어요.",
  },
]

// 이미지 로딩 실패(파일 없음 포함) 시 회색 placeholder로 대체
function SlideImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <div className="h-full w-full bg-stone-100" aria-label={alt} role="img" />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  )
}

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
