'use client'

import { useState } from 'react'
import Link from 'next/link'
import GroupSection from './GroupSection'
import { openLoginSheet } from '@/components/auth/LoginSheet'
import {
  sortCardsBy,
  CARD_SORT_LABELS,
  type CardSort,
  type GroupSectionData,
} from '@/lib/feedShared'

// 홈 피드 섹션 정렬 컨트롤 (STEP 2 + 정렬 드롭다운).
// - 섹션 순서: '우리 아이 시기 먼저' 토글 — OFF(기본) 연령 오름차순 고정(CLAUDE.md 7장),
//   ON이면 아이 시기(첫째 순, 중복 제거) 먼저 → 나머지 오름차순. 토글은 모두에게 보인다(2026.11.05 운영자):
//   로그인 안 함 → 로그인 시트 / 아이 정보 없음 → 마이페이지에서 아이 등록 안내 / 아이 있음 → 켜고 끄기.
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
  const [needChildHint, setNeedChildHint] = useState(false)
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
        <button
            type="button"
            role="switch"
            aria-checked={byChild}
            onClick={() => {
              if (!isLoggedIn) return openLoginSheet('child')
              if (!hasChild) return setNeedChildHint((v) => !v)
              setByChild((v) => !v)
            }}
            className="flex items-center gap-2"
          >
            <span className={`text-xs font-medium ${byChild ? 'text-main' : 'text-text/50'}`}>
              우리 아이 시기 먼저
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
      {needChildHint && (
        <div className="flex items-center gap-2 border-b border-black/5 bg-main/5 px-4 py-2.5 text-xs text-text/70">
          <span className="min-w-0 flex-1 break-keep">아이 생일을 등록하면 아이의 개월 수 시기에 해당하는 책을 먼저 보여 드려요.</span>
          <Link href="/mypage" className="shrink-0 font-medium text-main underline underline-offset-2">
            마이페이지에서 등록
          </Link>
          <button type="button" onClick={() => setNeedChildHint(false)} aria-label="안내 닫기" className="shrink-0 px-1 text-text/40">
            ✕
          </button>
        </div>
      )}

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
