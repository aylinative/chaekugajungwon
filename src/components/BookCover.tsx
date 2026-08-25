'use client'

import { useState } from 'react'

interface BookCoverProps {
  src?: string | null
  title: string
  size?: 'sm' | 'md' | 'lg'
  /** 크기·모서리 등은 부모가 지정 (예: 'h-24 w-16 rounded-md') */
  className?: string
}

// 표지 폴백 — 표지가 없거나(빈 값) 로딩 실패(404·만료) 시 '제목 카드'로 대체.
// 모든 표지 노출 지점에서 공용으로 써서 폴백이 '의도된 디자인'으로 보이게 한다.
export default function BookCover({ src, title, size = 'md', className = '' }: BookCoverProps) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }

  // 제목 카드: 따뜻한 단색 배경 + 제목 가운데. sm은 마크 생략 + 1줄.
  const clamp = size === 'lg' ? 'line-clamp-3' : size === 'sm' ? 'line-clamp-1' : 'line-clamp-2'
  const textSize = size === 'lg' ? 'text-sm' : size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div
      className={`flex flex-col items-center justify-center bg-surface-muted px-1.5 text-center ${className}`}
    >
      {size !== 'sm' && (
        <span className="mb-1 text-sm" aria-hidden>
          🌱
        </span>
      )}
      <span className={`${textSize} ${clamp} font-medium leading-tight text-text/70`}>{title}</span>
    </div>
  )
}
