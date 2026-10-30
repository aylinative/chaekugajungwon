'use client'

import { useState } from 'react'
import Link from 'next/link'

// 책의 모든 기록에서 합산한 주제 태그(빈도순, 중복 제거는 서버에서 처리). 보여주는 곳이라 '#'을 붙임.
// 세부가 있으면 세부 이름(#달). 누르면 홈 필터(?tag=slug)로 이동. 옛 직접 입력 태그는 링크 없음.
// 기본 3개 노출 + '+N 더보기'로 펼치기/접기. topics가 비면 렌더 자체를 안 함.
export interface TopicLink {
  name: string
  slug: string | null
}

const DEFAULT_VISIBLE = 3
const chipClass = 'flex-shrink-0 rounded-full bg-surface-accent px-3 py-1 text-xs text-text/70'

export default function BookTopics({ topics }: { topics: TopicLink[] }) {
  const [expanded, setExpanded] = useState(false)
  if (topics.length === 0) return null

  const visible = expanded ? topics : topics.slice(0, DEFAULT_VISIBLE)
  const hidden = topics.length - DEFAULT_VISIBLE

  return (
    <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-text">주제</h2>
      <div className="flex flex-wrap items-center gap-2">
        {visible.map((t) =>
          t.slug ? (
            <Link key={t.name} href={`/?tag=${encodeURIComponent(t.slug)}`} className={chipClass}>
              #{t.name}
            </Link>
          ) : (
            <span key={t.name} className={chipClass}>
              #{t.name}
            </span>
          )
        )}
        {hidden > 0 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="flex-shrink-0 text-xs text-main">
            {expanded ? '접기' : `+${hidden} 더보기`}
          </button>
        )}
      </div>
    </section>
  )
}
