'use client'

import { useState } from 'react'
import GroupSection from './GroupSection'
import {
  sortCardsBy,
  CARD_SORT_LABELS,
  type CardSort,
  type GroupSectionData,
} from '@/lib/feed'

// 홈 피드 섹션 정렬 컨트롤 (STEP 2 + 정렬 드롭다운).
// - 섹션 순서: '우리 아이 추천부터' 토글 — OFF(기본) 연령 오름차순 고정(CLAUDE.md 7장),
//   ON이면 아이 시기(첫째 순, 중복 제거) 먼저 → 나머지 오름차순. childGroups 비면 토글 숨김.
// - 카드 정렬: 추천순(기본, 서버 랭킹 유지) / 신간순(출간일 최신) / 제목순. 각 섹션 카드에 적용.
//   ※ 홈은 시기당 상위 12개 미리보기라 그 12개 안에서 재정렬된다(전체 정렬은 그룹 더보기).
const SORT_OPTIONS: CardSort[] = ['recommend', 'published', 'title']

export default function FeedSections({
  sections,
  childGroups,
  isLoggedIn,
}: {
  sections: GroupSectionData[]
  childGroups: string[]
  isLoggedIn: boolean
}) {
  const [byChild, setByChild] = useState(false)
  const [sort, setSort] = useState<CardSort>('recommend')
  const hasChild = childGroups.length > 0

  const ordered =
    byChild && hasChild
      ? [
          ...childGroups
            .map((v) => sections.find((s) => s.value === v))
            .filter((s): s is GroupSectionData => Boolean(s)),
          ...sections.filter((s) => !childGroups.includes(s.value)),
        ]
      : sections

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-black/5 px-4 py-2.5">
        {hasChild ? (
          <button
            type="button"
            role="switch"
            aria-checked={byChild}
            onClick={() => setByChild((v) => !v)}
            className="flex items-center gap-2"
          >
            <span className={`text-xs font-medium ${byChild ? 'text-main' : 'text-text/50'}`}>
              우리 아이 추천부터
            </span>
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                byChild ? 'bg-main' : 'bg-surface-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  byChild ? 'translate-x-[18px]' : 'translate-x-0.5'
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

      <div className="divide-y divide-black/5">
        {ordered.map((s) => (
          <GroupSection
            key={s.value}
            section={{ ...s, cards: sortCardsBy(s.cards, sort) }}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>
    </>
  )
}
