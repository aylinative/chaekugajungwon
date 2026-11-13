'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSwipe } from '@/lib/useSwipe'

// 기록 상세 참고사진 (2026.11.14) — 썸네일을 누르면 전체 화면으로 크게 보고, 좌우로 밀어 넘김.
// 아래로 밀기·✕·Esc로 닫기. PC는 ‹ › 버튼·방향키.
export default function PostPhotos({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const count = urls.length
  const prev = () => setOpen((i) => (i === null || i === 0 ? i : i - 1))
  const next = () => setOpen((i) => (i === null || i >= count - 1 ? i : i + 1))
  const close = () => setOpen(null)
  const swipe = useSwipe({ onLeft: next, onRight: prev, onDown: close })

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      else if (e.key === 'ArrowLeft') setOpen((i) => (i === null || i === 0 ? i : i - 1))
      else if (e.key === 'ArrowRight') setOpen((i) => (i === null || i >= count - 1 ? i : i + 1))
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // 뒤 화면 스크롤 막기
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, count])

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((url, i) => (
          <button key={url} type="button" onClick={() => setOpen(i)} aria-label={`사진 ${i + 1} 크게 보기`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`사진 ${i + 1}`} className="h-24 w-full rounded-xl object-cover" />
          </button>
        ))}
      </div>

      {open !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="사진 보기"
            {...swipe}
          >
            <div className="flex items-center justify-between px-4 pb-3 pt-safe-3 text-white">
              <span className="text-sm text-white/70">
                {count > 1 ? `${open + 1} / ${count}` : ''}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="flex h-11 w-11 items-center justify-center text-2xl text-white/80"
              >
                ×
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden pb-safe">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[open]} alt={`사진 ${open + 1}`} className="max-h-full max-w-full object-contain" />
              {open > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  aria-label="이전 사진"
                  className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white sm:flex"
                >
                  ‹
                </button>
              )}
              {open < count - 1 && (
                <button
                  type="button"
                  onClick={next}
                  aria-label="다음 사진"
                  className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white sm:flex"
                >
                  ›
                </button>
              )}
            </div>

            {/* 여러 장일 때 위치 점 — 밀어서 넘길 수 있다는 단서 */}
            {count > 1 && (
              <div className="flex justify-center gap-1.5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                {urls.map((url, i) => (
                  <span key={url} className={`h-1.5 w-1.5 rounded-full ${i === open ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
