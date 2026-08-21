'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface ShelfItem {
  href: string
  cover: string | null
  title: string
}

// 전면책장(온라인 서점식) — 한 행 3권, 표지+제목만. 최근 기록이 위로 쌓임.
// 기본 3행(9권)까지 보이고, 더 있으면 '펼쳐보기'로 전체 노출.
// 수정/삭제·저장 해제 등 관리는 표지를 눌러 넘어간 페이지(기록 상세/책 페이지)에서 한다.
const VISIBLE = 9 // 3열 × 3행

export default function Bookshelf({
  items,
  emptyText,
}: {
  items: ShelfItem[]
  emptyText: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-surface px-6 py-8 text-center shadow-sm">
        <p className="text-sm text-text/50">{emptyText}</p>
      </div>
    )
  }

  const shown = expanded ? items : items.slice(0, VISIBLE)

  return (
    <div>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
        {shown.map((item, i) => (
          <li key={`${item.href}-${i}`}>
            <Link href={item.href} className="block">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-surface-muted shadow-sm">
                {item.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    📖
                  </div>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-text/80">
                {item.title}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {items.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-xl border border-main/30 py-2 text-xs font-medium text-main"
        >
          {expanded ? '접기 ▲' : `펼쳐보기 (${items.length}) ▼`}
        </button>
      )}
    </div>
  )
}
