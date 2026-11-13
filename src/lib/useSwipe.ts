'use client'

import { useRef } from 'react'

// 좌우 밀기 감지 (2026.11.14) — 사진 보기·캘린더 등 '영역 안'에서만 쓴다.
// - 가로로 충분히(threshold) + 세로보다 확실히 더 움직였을 때만 → 위아래 스크롤과 안 부딪힘
// - 화면 왼쪽 끝(EDGE)에서 시작한 밀기는 무시 → 아이폰 '밀어서 뒤로 가기'와 안 부딪힘
const EDGE = 24

interface Options {
  onLeft?: () => void // 왼쪽으로 밀기 = 다음
  onRight?: () => void // 오른쪽으로 밀기 = 이전
  onDown?: () => void // 아래로 밀기 (사진 보기 닫기 등)
  threshold?: number
}

export function useSwipe({ onLeft, onRight, onDown, threshold = 50 }: Options) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      start.current = t.clientX < EDGE ? null : { x: t.clientX, y: t.clientY }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onLeft?.()
        else onRight?.()
      } else if (onDown && dy >= threshold * 2 && dy > Math.abs(dx) * 1.5) {
        onDown()
      }
    },
  }
}
