'use client'

import { useState, type ReactNode } from 'react'

interface SectionNode {
  value: string
  node: ReactNode
}

// 홈 피드 섹션 정렬 토글 (STEP 2). 서버에서 렌더한 GroupSection 노드를 받아 순서만 바꾼다.
// - 일반 순서: 연령 오름차순 고정(기본, CLAUDE.md 7장 원칙 유지)
// - 우리 아이 기준: 아이 시기(첫째 순, 중복 제거) 먼저 → 나머지 오름차순
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

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${
      active ? 'bg-main text-white' : 'bg-surface-muted text-text/60'
    }`

  return (
    <>
      {hasChild && (
        <div className="flex gap-2 border-b border-black/5 px-4 py-3">
          <button type="button" onClick={() => setByChild(false)} className={chip(!byChild)}>
            일반 순서
          </button>
          <button type="button" onClick={() => setByChild(true)} className={chip(byChild)}>
            우리 아이 기준
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
