'use client'

import { useEffect, useState } from 'react'

// 인앱 스플래시 — 앱(하드 로드/ PWA 실행) 첫 진입 시 잠깐 뜨는 로고 + 서비스명 화면.
// layout에 마운트되므로 클라이언트 라우팅(soft navigation)에는 다시 뜨지 않고 최초 1회만 뜬다.
// 크림 배경(bg-bg) 위 로고 + '책육아정원'(포인트 컬러). 짧게 보여주고 페이드아웃.
const VISIBLE_MS = 1600 // 로고 노출 시간 (네이티브 스플래시에 이어 브랜드 화면을 충분히 노출)
const FADE_MS = 450 // 페이드아웃 시간

export default function Splash() {
  const [hidden, setHidden] = useState(false) // 페이드 시작
  const [removed, setRemoved] = useState(false) // DOM 제거

  useEffect(() => {
    const fade = setTimeout(() => setHidden(true), VISIBLE_MS)
    const gone = setTimeout(() => setRemoved(true), VISIBLE_MS + FADE_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(gone)
    }
  }, [])

  if (removed) return null

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg transition-opacity duration-[400ms] ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-512.png"
        alt="책육아정원 로고"
        width={144}
        height={144}
        className="h-36 w-36"
      />
      <p className="mt-4 text-2xl font-semibold text-point">책육아정원</p>
    </div>
  )
}
