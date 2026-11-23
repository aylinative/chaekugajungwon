'use client'

import { useRef, useState } from 'react'

// 책 페이지 — 같은 사람의 재독 기록을 가로로 넘기는 한 줄 (2026.11.23).
// 최신 회차가 맨 앞. 카드는 한 장씩 전체 폭(옆 카드 살짝 보이기는 카드 모양이 어긋나 뺌 — 운영자),
// 넘길 수 있다는 표시는 카드 아래 얇은 바 하나(점보다 자리를 적게 차지).
// 브라우저 기본 가로 스크롤 + 카드 단위 멈춤(scroll-snap) — 책 정보 카드 좌우 밀기·iOS 가장자리 뒤로 가기와 영역이 겹치지 않는다.
export default function RecordSwipeRow({ cards }: { cards: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0) // 0~1 스크롤 위치

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgress(max > 0 ? el.scrollLeft / max : 0)
  }

  const thumb = 1 / cards.length // 바 길이 = 보이는 카드 비율
  return (
    <li>
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-start">
            {card}
          </div>
        ))}
      </div>
      {/* 얇은 진행 바 — 지금 위치 표시 */}
      <div className="mx-auto mt-2 h-0.5 w-16 overflow-hidden rounded-full bg-black/10" aria-hidden>
        <div
          className="h-full rounded-full bg-text/30"
          style={{ width: `${thumb * 100}%`, transform: `translateX(${progress * (1 / thumb - 1) * 100}%)` }}
        />
      </div>
    </li>
  )
}
