'use client'

import { useState } from 'react'
import Link from 'next/link'

// 책의 모든 기록에서 합산한 주제 태그(빈도순, 중복 제거는 서버에서 처리).
// 칩 스타일은 홈피드 주제 필터 하위 태그 칩과 동일. 클릭 시 ?tag= 로 홈 필터 진입(SSR).
// 기본 3개 노출 + '+N 더보기'로 펼치기/접기. topics가 비면 서버에서 렌더 자체를 안 함.
const DEFAULT_VISIBLE = 3
const chipClass =
  'flex-shrink-0 rounded-full bg-surface-accent px-3 py-1 text-xs text-text/70'

export default function BookTopics({ topics }: { topics: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (topics.length === 0) return null

  const visible = expanded ? topics : topics.slice(0, DEFAULT_VISIBLE)
  const hidden = topics.length - DEFAULT_VISIBLE

  return (
    <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-text">주제</h2>
      <div className="flex flex-wrap items-center gap-2">
        {visible.map((name) => (
          <Link
            key={name}
            href={`/?tag=${encodeURIComponent(name)}`}
            className={chipClass}
          >
            #{name}
          </Link>
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 text-xs text-main"
          >
            {expanded ? '접기' : `+${hidden} 더보기`}
          </button>
        )}
      </div>
    </section>
  )
}
