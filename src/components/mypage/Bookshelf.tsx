'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface ShelfItem {
  href: string
  cover: string | null
  title: string
}

// 전면책장 — 한 행 4권(표지만), 각 행 아래 '선반 바'로 책이 꽂힌 느낌.
// 제목 텍스트는 생략(표지로 식별 + 탭 이동, alt로 접근성 유지). 기본 3행(12권), 더 있으면 펼쳐보기.
const COLS = 4
const VISIBLE = 12 // 4열 × 3행

function chunk<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size))
  return rows
}

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
  const rows = chunk(shown, COLS)

  return (
    <div>
      {rows.map((row, r) => (
        <div key={r}>
          <div className="grid grid-cols-4 gap-2">
            {row.map((item, i) => (
              <Link key={`${item.href}-${i}`} href={item.href} className="block">
                {/* 표지: 위 모서리만 둥글게 → 선반에 평평히 얹힌 느낌 */}
                <div className="aspect-[3/4] w-full overflow-hidden rounded-t-md bg-surface-muted shadow-sm">
                  {item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      📖
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {/* 선반 바 (나무 톤) — 밑에 옅은 그림자로 책이 꽂힌 판자처럼 */}
          <div className="mb-5 mt-0.5 h-2.5 rounded-[3px] bg-[#dcc59b] shadow-[0_3px_5px_-1px_rgba(120,90,50,0.28)]" />
        </div>
      ))}

      {items.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 w-full rounded-xl border border-main/30 py-2 text-xs font-medium text-main"
        >
          {expanded ? '접기 ▲' : `펼쳐보기 (${items.length}) ▼`}
        </button>
      )}
    </div>
  )
}
