'use client'

import { useState } from 'react'

// 온보딩/가이드 공용 이미지 — 로딩 실패(파일 없음 포함) 시 회색 placeholder로 대체.
// 스크린샷 교체 전까지는 placeholder가 뜬다.
export default function SlideImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
}: {
  src: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <div className={`bg-stone-100 ${className}`} aria-label={alt} role="img" />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />
  )
}
