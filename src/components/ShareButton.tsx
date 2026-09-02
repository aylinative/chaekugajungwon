'use client'

import { useState } from 'react'

interface Props {
  // 공유할 경로(예: /book/9788970940564). 절대 URL은 실행 시 origin 붙여 만든다.
  path: string
  title: string
  text?: string
}

// 공유 버튼 — 모바일은 Web Share API(네이티브 시트), 미지원 환경은 링크 복사 폴백.
export default function ShareButton({ path, title, text }: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = typeof window !== 'undefined' ? window.location.origin + path : path

    // Web Share API (모바일 브라우저 대부분 지원)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url })
        return
      } catch {
        return // 사용자가 취소한 경우 등 — 조용히 종료
      }
    }

    // 폴백: 클립보드에 링크 복사
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드도 막힌 환경 — 무시
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="공유"
      className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-surface-muted px-2.5 py-1.5 text-xs text-text/60"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? '링크 복사됨' : '공유'}
    </button>
  )
}
