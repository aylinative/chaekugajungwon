'use client'

import { useState } from 'react'
import { sortGroupLabelsByAge, LABEL_TO_EMOJI } from '@/lib/groups'
import RecommendSheet, { type RecommendResult } from '@/components/post/RecommendSheet'

// '나도 추천해요' 버튼 — 탭 시 바텀시트로 추천 시기 다중 선택.
// 카드: 글자 없이 엄지 아이콘 채움+색으로 추천 여부 표현 (저장 아이콘과 동일 패턴)
// 상세: '추천함 · 🌱 +2' — 대표 시기는 연령 오름차순 첫 번째, 아이콘으로 표기 (10.3)

interface Props {
  postId: string
  initialLiked: boolean
  initialCount: number
  initialGroups: string[] // 내가 고른 시기 (재탭 시 시트에 표시)
  isLoggedIn: boolean
  variant?: 'card' | 'detail'
}

export function ThumbIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  )
}

export default function RecommendButton({
  postId,
  initialLiked,
  initialCount,
  initialGroups,
  isLoggedIn,
  variant = 'detail',
}: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [groups, setGroups] = useState<string[]>(initialGroups)
  const [sheetOpen, setSheetOpen] = useState(false)

  const openSheet = (e: React.MouseEvent) => {
    // 카드(Link 내부)에서 눌러도 페이지 이동하지 않도록 차단
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      window.location.href = '/api/auth/kakao'
      return
    }
    setSheetOpen(true)
  }

  const handleSaved = (r: RecommendResult) => {
    setLiked(r.liked)
    setCount(r.count)
    setGroups(r.groupNames)
  }

  // 상세 표기: '추천함 · 🌱 +2' (대표 시기 = 연령 오름차순 첫 번째, 1개면 +N 없이)
  const sorted = sortGroupLabelsByAge(groups)
  const detailLabel =
    liked && sorted.length > 0 ? (
      <>
        추천함 · <span aria-label={sorted[0]}>{LABEL_TO_EMOJI[sorted[0]] ?? sorted[0]}</span>
        {sorted.length > 1 ? ` +${sorted.length - 1}` : ''}
      </>
    ) : (
      '나도 추천해요'
    )

  const sheet = sheetOpen ? (
    <RecommendSheet
      postId={postId}
      initialGroups={liked ? groups : []}
      onSaved={handleSaved}
      onClose={() => setSheetOpen(false)}
    />
  ) : null

  if (variant === 'card') {
    return (
      <>
        <button
          type="button"
          onClick={openSheet}
          aria-pressed={liked}
          aria-label={liked ? '추천함' : '나도 추천해요'}
          className={`flex items-center gap-0.5 text-xs ${
            liked ? 'font-medium text-main' : 'text-text/40'
          }`}
        >
          <ThumbIcon filled={liked} size={14} />
          {count}
        </button>
        {sheet}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openSheet}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
            liked ? 'bg-main/10 font-medium text-main' : 'bg-surface-muted text-text/60'
          }`}
        >
          <ThumbIcon filled={liked} size={16} />
          {detailLabel}
        </button>
        <span className="text-sm text-text/50">{count}</span>
      </div>
      {sheet}
    </>
  )
}
