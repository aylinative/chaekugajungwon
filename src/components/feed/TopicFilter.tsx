'use client'

import { useMemo } from 'react'
import { TAG_CATEGORIES } from '@/lib/tagCategories'
import type { FilterTag, TopicFilterValue } from '@/lib/topicDisplay'

// 주제 필터 — 큰 분류(가로 스크롤) → 그 안의 주제 칩 → (세부가 있는 주제면) 세부 칩.
// 큰 분류만 고르면 그 큰 분류 전체(개편 전 숨김 태그 기록 포함)를 보여줌. 고르는 곳이라 '#' 없음.
// 홈(주소 이동, 서버 필터)과 시기 더보기(화면 안 필터)가 같이 씀 — 동작은 onSelect로 받는다.
export default function TopicFilter({
  tags,
  value,
  onSelect,
}: {
  tags: FilterTag[]
  value: TopicFilterValue
  onSelect: (next: TopicFilterValue) => void
}) {
  const active = useMemo(() => tags.filter((t) => t.isActive), [tags])
  const cats = useMemo(
    () => TAG_CATEGORIES.filter((c) => active.some((t) => t.category === c)),
    [active]
  )

  const current = value.tag ? tags.find((t) => t.slug === value.tag) : undefined
  const cat = value.cat ?? current?.category
  const topicSlug = current ? (current.level === 'detail' ? current.parent : current.slug) : null
  const topics = active.filter((t) => t.category === cat && t.level === 'topic').sort((a, b) => a.sortOrder - b.sortOrder)
  const details = topicSlug
    ? active.filter((t) => t.parent === topicSlug).sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  if (cats.length === 0) return null

  const scroll = 'flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
  const catChip = (on: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${on ? 'bg-main text-white' : 'bg-surface-muted text-text/70'}`
  const tagChip = (on: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1 text-xs ${on ? 'bg-main text-white' : 'bg-surface-accent text-text/70'}`

  return (
    <div>
      <div className={`${scroll} pb-2`}>
        <button type="button" onClick={() => onSelect({})} className={catChip(!cat)}>
          전체
        </button>
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c === cat && !value.tag ? {} : { cat: c })}
            aria-pressed={c === cat}
            className={catChip(c === cat)}
          >
            {c}
          </button>
        ))}
      </div>

      {cat && topics.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {topics.map((t) => {
            const on = topicSlug === t.slug
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => onSelect(on && value.tag === t.slug ? { cat } : { cat, tag: t.slug })}
                aria-pressed={on}
                className={tagChip(on)}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}

      {details.length > 0 && (
        <div className={`${scroll} pb-2`}>
          <span className="flex-shrink-0 self-center text-[11px] text-text/45">
            {tags.find((t) => t.slug === topicSlug)?.name} ›
          </span>
          {details.map((d) => {
            const on = value.tag === d.slug
            return (
              <button
                key={d.slug}
                type="button"
                onClick={() => onSelect(on ? { cat, tag: topicSlug! } : { cat, tag: d.slug })}
                aria-pressed={on}
                className={tagChip(on)}
              >
                {d.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
