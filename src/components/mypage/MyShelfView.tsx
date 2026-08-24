'use client'

import { useState } from 'react'
import Bookshelf, { type ShelfItem } from './Bookshelf'
import { TOPIC_CATEGORY_ORDER } from '@/lib/tags'

// 우리집 책장 = 같은 데이터(내 책), 뷰만 토글: 최근순 전면책장 ↔ 주제(대표 카테고리)별 전면책장.
// 세부 기록은 안 보이고 표지만. 한 책이 여러 카테고리에 속하면 각 섹션에 중복 노출(다중 태그).
export interface ShelfBook extends ShelfItem {
  categories: string[] // 이 책의 대표 카테고리들(주제 태그 기반)
}

const UNTAGGED = '주제 없음'

export default function MyShelfView({ books }: { books: ShelfBook[] }) {
  const [view, setView] = useState<'recent' | 'topic'>('recent')

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${
      active ? 'bg-main text-white' : 'bg-surface-muted text-text/60'
    }`

  // 주제별: 카테고리 순서대로 섹션. 마지막에 주제 없는 책.
  const sections =
    view === 'topic'
      ? [
          ...TOPIC_CATEGORY_ORDER.map((cat) => ({
            category: cat,
            items: books.filter((b) => b.categories.includes(cat)),
          })),
          { category: UNTAGGED, items: books.filter((b) => b.categories.length === 0) },
        ].filter((s) => s.items.length > 0)
      : []

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => setView('recent')} className={chip(view === 'recent')}>
          최근순
        </button>
        <button type="button" onClick={() => setView('topic')} className={chip(view === 'topic')}>
          주제별
        </button>
      </div>

      {view === 'recent' ? (
        <Bookshelf items={books} emptyText="아직 기록한 책이 없어요." />
      ) : (
        <div className="space-y-5">
          {sections.map((s) => (
            <div key={s.category}>
              <p className="mb-2 text-xs font-medium text-text/50">
                {s.category} <span className="text-text/30">· {s.items.length}</span>
              </p>
              <Bookshelf items={s.items} emptyText="" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
