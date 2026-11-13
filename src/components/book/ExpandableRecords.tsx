'use client'

import { useState } from 'react'

// 책 페이지 책육아 기록 — 처음엔 최신 VISIBLE개, 더 있으면 아래 '펼쳐보기'로 전부 (2026.11.14, 우리집 책장과 같은 방식).
// 카드는 서버에서 그린 것을 그대로 받아 보여주기만 한다.
const VISIBLE = 3

export default function ExpandableRecords({ items }: { items: React.ReactNode[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, VISIBLE)
  return (
    <>
      <ul className="space-y-3">{shown}</ul>
      {items.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-xl border border-main/30 py-2 text-xs font-medium text-main"
        >
          {expanded ? '접기 ▲' : `펼쳐보기 (${items.length}) ▼`}
        </button>
      )}
    </>
  )
}
