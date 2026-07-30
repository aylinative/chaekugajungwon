'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { OperatorTag } from '@/lib/feed'

// 접힌 상태에서 '전체' 다음에 노출할 태그 개수
const COLLAPSED_COUNT = 4

// 운영자 태그 필터 바. 태그 클릭 시 ?tag= 로 이동해 서버에서 필터링(SSR 유지).
// 태그가 많아 가로 스크롤로 찾기 어려우므로, 기본은 4개만 보이고
// '더보기'를 누르면 전체 카테고리가 여러 줄로 펼쳐진다.
export default function TopicFilterBar({
  tags,
  activeTag,
}: {
  tags: OperatorTag[]
  activeTag?: string
}) {
  // 선택된 태그가 접힌 범위 밖에 있으면 처음부터 펼친 상태로 시작
  const activeHidden =
    Boolean(activeTag) &&
    tags.findIndex((t) => t.name === activeTag) >= COLLAPSED_COUNT
  const [expanded, setExpanded] = useState(activeHidden)

  if (tags.length === 0) return null

  const needsToggle = tags.length > COLLAPSED_COUNT
  const visibleTags = expanded ? tags : tags.slice(0, COLLAPSED_COUNT)

  const chipClass = (active: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
      active ? 'bg-main text-white' : 'bg-surface-muted text-text/70'
    }`

  return (
    <div
      className={`flex gap-2 px-4 py-3 ${
        expanded ? 'flex-wrap' : 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      }`}
    >
      <Link href="/" className={chipClass(!activeTag)}>
        전체
      </Link>

      {visibleTags.map((tag) => (
        <Link
          key={tag.id}
          href={`/?tag=${encodeURIComponent(tag.name)}`}
          className={chipClass(tag.name === activeTag)}
        >
          #{tag.name}
        </Link>
      ))}

      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 rounded-full border border-main/30 px-3 py-1.5 text-xs font-medium text-main"
        >
          {expanded ? '접기 ▲' : '더보기 ▼'}
        </button>
      )}
    </div>
  )
}
