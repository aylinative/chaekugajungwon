'use client'

import { useMemo, useState } from 'react'
import BookCardItem from './BookCard'
import { groupTagsByCategory } from '@/lib/tags'
import {
  sortCardsBy,
  CARD_SORT_LABELS,
  type CardSort,
  type BookCard,
  type OperatorTag,
} from '@/lib/feed'

// 그룹(시기) 전체보기 브라우저 — 3번 개편.
// - 주제 필터: 홈 TopicFilterBar와 동일한 카테고리→하위 태그 드릴다운(단, 여기선 클라 필터).
// - 내 기록 제외 토글: 내가 이미 기록(posts)한 책 카드를 목록에서 뺀다.
// - 정렬 드롭다운: 추천순(기본, 서버 랭킹 유지)/신간순/제목순. lib/feed.ts sortCardsBy 공용.
// - 표지 3열 그리드(홈 카드 크기감).
const SORT_OPTIONS: CardSort[] = ['recommend', 'published', 'title']

export default function GroupBrowser({
  cards,
  operatorTags,
  myBookIds,
  isLoggedIn,
  showBoardBook,
}: {
  cards: BookCard[]
  operatorTags: OperatorTag[]
  myBookIds: string[]
  isLoggedIn: boolean
  showBoardBook: boolean
}) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [excludeMine, setExcludeMine] = useState(false)
  const [sort, setSort] = useState<CardSort>('recommend')

  const groups = useMemo(() => groupTagsByCategory(operatorTags), [operatorTags])
  const mineSet = useMemo(() => new Set(myBookIds), [myBookIds])
  const hasMineInGroup = useMemo(
    () => isLoggedIn && cards.some((c) => mineSet.has(c.bookId)),
    [isLoggedIn, cards, mineSet]
  )

  const visible = useMemo(() => {
    const filtered = cards.filter(
      (c) =>
        (!activeTag || c.topics.includes(activeTag)) &&
        (!excludeMine || !mineSet.has(c.bookId))
    )
    return sortCardsBy(filtered, sort)
  }, [cards, activeTag, excludeMine, mineSet, sort])

  const openGroup = groups.find((g) => g.category === openCategory)

  const catChip = (active: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
      active ? 'bg-main text-white' : 'bg-surface-muted text-text/70'
    }`
  const tagChip = (active: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1 text-xs ${
      active ? 'bg-main text-white' : 'bg-surface-accent text-text/70'
    }`

  return (
    <div>
      {/* 주제 필터 — 카테고리 드릴다운 (홈과 동일 UI, 클라 필터) */}
      {groups.length > 0 && (
        <div className="mb-1">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setActiveTag(null)
                setOpenCategory(null)
              }}
              className={catChip(!activeTag)}
            >
              전체
            </button>
            {groups.map((g) => {
              const isOpen = openCategory === g.category
              const holdsActive = activeTag != null && g.tags.includes(activeTag)
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
          {openGroup && (
            <div className="flex flex-wrap gap-2 pb-2">
              {openGroup.tags.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveTag((t) => (t === name ? null : name))}
                  className={tagChip(name === activeTag)}
                >
                  #{name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 내 기록 제외 토글 + 정렬 드롭다운 (한 줄) */}
      <div className="flex items-center justify-between gap-2 py-2">
        {hasMineInGroup ? (
          <button
            type="button"
            role="switch"
            aria-checked={excludeMine}
            onClick={() => setExcludeMine((v) => !v)}
            className="flex items-center gap-2"
          >
            <span
              className={`text-xs font-medium ${excludeMine ? 'text-main' : 'text-text/50'}`}
            >
              내 기록 제외
            </span>
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                excludeMine ? 'bg-main' : 'bg-surface-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  excludeMine ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        ) : (
          <span />
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as CardSort)}
          aria-label="정렬 방식"
          className="rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-medium text-text/70 outline-none focus:border-main"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {CARD_SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-xs text-text/40">총 {visible.length}권</p>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-text/50">조건에 맞는 책이 없어요.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5">
          {visible.map((card) => (
            <BookCardItem
              key={card.bookId}
              card={card}
              isLoggedIn={isLoggedIn}
              fullWidth
              showBoardBook={showBoardBook}
            />
          ))}
        </div>
      )}
    </div>
  )
}
