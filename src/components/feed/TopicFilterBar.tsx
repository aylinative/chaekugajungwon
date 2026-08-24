'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { OperatorTag } from '@/lib/feed'
import { groupTagsByCategory } from '@/lib/tags'

// 주제 필터 — 대표 카테고리 칩(가로 스크롤). 카테고리를 누르면 그 아래 하위 태그가 펼쳐지고,
// 하위 태그를 누르면 ?tag= 로 이동해 서버에서 필터링(SSR 유지). 카테고리 자체는 필터가 아니라
// '펼치기' — 하위 태그가 실제 필터. (CLAUDE.md 8.1 드릴다운)
export default function TopicFilterBar({
  tags,
  activeTag,
}: {
  tags: OperatorTag[]
  activeTag?: string
}) {
  const groups = groupTagsByCategory(tags)

  // 현재 필터(activeTag)가 속한 카테고리를 찾아 초기에 펼쳐 둔다
  const activeCategory =
    activeTag != null
      ? groups.find((g) => g.tags.includes(activeTag))?.category ?? null
      : null
  const [openCategory, setOpenCategory] = useState<string | null>(activeCategory)

  if (groups.length === 0) return null

  const catChip = (active: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
      active ? 'bg-main text-white' : 'bg-surface-muted text-text/70'
    }`
  const tagChip = (active: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1 text-xs ${
      active ? 'bg-main text-white' : 'bg-surface-accent text-text/70'
    }`

  const openGroup = groups.find((g) => g.category === openCategory)

  return (
    <div className="border-b border-black/5">
      {/* 대표 카테고리 (가로 스크롤) */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link href="/" className={catChip(!activeTag)}>
          전체
        </Link>
        {groups.map((g) => {
          const isOpen = openCategory === g.category
          const holdsActive = activeTag != null && g.category === activeCategory
          return (
            <button
              key={g.category}
              type="button"
              onClick={() =>
                setOpenCategory((c) => (c === g.category ? null : g.category))
              }
              aria-expanded={isOpen}
              className={catChip(isOpen || holdsActive)}
            >
              {g.category}
              <span className="ml-1 text-[10px] opacity-70">{isOpen ? '▲' : '▾'}</span>
            </button>
          )
        })}
      </div>

      {/* 펼쳐진 카테고리의 하위 태그 */}
      {openGroup && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {openGroup.tags.map((name) => (
            <Link
              key={name}
              href={`/?tag=${encodeURIComponent(name)}`}
              className={tagChip(name === activeTag)}
            >
              #{name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
