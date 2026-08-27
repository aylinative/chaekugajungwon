'use client'

import { useState, type ReactNode } from 'react'

interface SectionNode {
  value: string
  node: ReactNode
}

// 홈 피드 섹션 정렬 (STEP 2). 서버에서 렌더한 GroupSection 노드를 받아 순서만 바꾼다.
// - OFF(기본): 연령 오름차순 고정(CLAUDE.md 7장 원칙 유지)
// - ON '우리 아이 추천부터': 아이 시기(첫째 순, 중복 제거) 먼저 → 나머지 오름차순
// childGroups가 비어있으면(비로그인·무자녀) 토글을 숨기고 일반 순서만.
export default function FeedSections({
  sections,
  childGroups,
}: {
  sections: SectionNode[]
  childGroups: string[]
}) {
  const [byChild, setByChild] = useState(false)
  const hasChild = childGroups.length > 0

  const ordered =
    byChild && hasChild
      ? [
          ...childGroups
            .map((v) => sections.find((s) => s.value === v))
            .filter((s): s is SectionNode => Boolean(s)),
          ...sections.filter((s) => !childGroups.includes(s.value)),
        ]
      : sections

  return (
    <>
      {hasChild && (
        <div className="flex justify-end border-b border-black/5 px-4 py-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={byChild}
            onClick={() => setByChild((v) => !v)}
            className="flex items-center gap-2"
          >
            <span
              className={`text-xs font-medium ${byChild ? 'text-main' : 'text-text/50'}`}
            >
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
        </div>
      )}
      <div className="divide-y divide-black/5">
        {ordered.map((s) => (
          <div key={s.value}>{s.node}</div>
        ))}
      </div>
    </>
  )
}
