'use client'

import { useEffect, useState } from 'react'
import { confirmLeave } from '@/lib/leaveGuard'

// 아이폰 앱(BookgardeningApp/iOS)에서 화면 왼쪽 끝을 오른쪽으로 밀면 뒤로 가기 (2026.11.14).
// 앱의 기본 밀기(allowsBackForwardNavigationGestures, 1.0.1)는 사이트 안 화면 이동(Next.js)을 잡지 못해
// 사이트 쪽에서 처리한다 → 앱 업데이트 없이 반영, 작성 중이면 이탈 확인(lib/leaveGuard)도 묻는다.
// 안드로이드·브라우저는 기기/브라우저 뒤로 가기가 있어 켜지 않는다.
const EDGE = 24 // 이 안에서 시작한 밀기만 (영역 안 좌우 밀기 useSwipe는 이 구간을 무시해 겹치지 않음)
const TRIGGER = 80 // 이만큼 밀면 뒤로

export default function EdgeSwipeBack() {
  const [enabled, setEnabled] = useState(false)
  const [drag, setDrag] = useState(0) // 표시용 이동 거리

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(/BookgardeningApp\/iOS/.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number } | null = null
    let dx = 0
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      // 사진 크게 보기 등 화면을 덮은 창이 열려 있으면(스크롤 잠금) 무시
      start = t.clientX <= EDGE && document.body.style.overflow !== 'hidden' ? { x: t.clientX, y: t.clientY } : null
      dx = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!start) return
      const t = e.touches[0]
      dx = t.clientX - start.x
      const dy = Math.abs(t.clientY - start.y)
      if (dy > Math.max(30, dx)) {
        start = null // 세로 스크롤로 판단
        setDrag(0)
        return
      }
      setDrag(Math.max(0, dx))
    }
    const onEnd = () => {
      const go = start !== null && dx >= TRIGGER
      start = null
      setDrag(0)
      if (go && window.history.length > 1 && confirmLeave()) window.history.back()
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled])

  if (!enabled || drag <= 10) return null
  const ready = drag >= TRIGGER
  // 밀고 있는 동안 왼쪽 가장자리에 ‹ 원이 따라 나온다 (충분히 밀면 진해짐)
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 top-1/2 z-[80] flex h-10 w-10 items-center justify-center rounded-full text-xl text-white shadow ${
        ready ? 'bg-main' : 'bg-main/40'
      }`}
      style={{ transform: `translate(${Math.min(drag, TRIGGER) - 30}px, -50%)` }}
    >
      ‹
    </div>
  )
}
