'use client'

import { useState } from 'react'
import { BOOKMARK_COUNT_MIN_DISPLAY } from '@/lib/constants'

interface Props {
  bookId: string
  initialBookmarked: boolean
  initialCount: number // books.bookmark_count (트리거 동기화 값)
  isLoggedIn: boolean
  variant?: 'card' | 'detail'
  onToggled?: (bookmarked: boolean) => void // 서버 반영 성공 후 호출
}

// 저장(북마크) 버튼 — '나중에 아이와 읽기' 개인 리스트에 추가.
// 저장 수는 BOOKMARK_COUNT_MIN_DISPLAY 이상일 때만 표시(미만이면 영역 자체를 렌더링하지 않음).
export default function BookmarkButton({
  bookId,
  initialBookmarked,
  initialCount,
  isLoggedIn,
  variant = 'detail',
  onToggled,
}: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  const toggle = async (e: React.MouseEvent) => {
    // 카드(Link 내부)에서 눌러도 페이지 이동하지 않도록 차단
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      window.location.href = '/api/auth/kakao'
      return
    }
    if (pending) return
    setPending(true)
    setMessage('')

    // 낙관적 업데이트
    const prev = { bookmarked, count }
    setBookmarked(!bookmarked)
    setCount((c) => c + (bookmarked ? -1 : 1))

    try {
      const res = await fetch(`/api/books/${bookId}/bookmark`, {
        method: bookmarked ? 'DELETE' : 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.')
      setBookmarked(data.bookmarked)
      setCount(data.count)
      onToggled?.(data.bookmarked)
    } catch (err) {
      setBookmarked(prev.bookmarked)
      setCount(prev.count)
      // 거부 사유(예: 이미 기록한 책)를 잠깐 보여준다
      setMessage(err instanceof Error ? err.message : '요청에 실패했습니다.')
      setTimeout(() => setMessage(''), 2500)
    } finally {
      setPending(false)
    }
  }

  const icon = (
    <svg
      width={variant === 'card' ? 16 : 20}
      height={variant === 'card' ? 16 : 20}
      viewBox="0 0 24 24"
      fill={bookmarked ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  )

  if (variant === 'card') {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={toggle}
          aria-label={bookmarked ? '저장 해제' : '저장'}
          aria-pressed={bookmarked}
          className={`rounded-full p-1 ${bookmarked ? 'text-main' : 'text-text/30'}`}
        >
          {icon}
        </button>
        {message && (
          <span className="absolute bottom-full right-0 z-10 mb-1 whitespace-nowrap rounded-lg bg-text/80 px-2 py-1 text-[10px] text-white">
            {message}
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={bookmarked}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
          bookmarked ? 'bg-main/10 text-main' : 'bg-surface-muted text-text/60'
        }`}
      >
        {icon}
        {bookmarked ? '저장됨' : '저장'}
      </button>
      {count >= BOOKMARK_COUNT_MIN_DISPLAY && (
        <span className="text-xs text-text/50">{count}명이 담았어요</span>
      )}
      {message && <span className="text-xs text-point">{message}</span>}
    </div>
  )
}
