'use client'

import { useEffect, useState } from 'react'

// 인앱 스플래시 — 로고 + 서비스명 화면. 브라우저 접속의 로딩 화면 역할.
// ⚠️ 설치형 PWA(standalone)에서는 OS 네이티브 스플래시(iOS apple-touch-startup-image /
//    Android manifest 스플래시)가 이미 뜨므로 인앱 스플래시를 생략한다.
//    (그러지 않으면 특히 Android 홈 바로가기에서 스플래시가 두 번 보인다 — 2026.09 피드백)
//    반대로 Safari 등 일반 브라우저 접속에는 네이티브 스플래시가 없으므로 인앱 스플래시가 필요하다.
// layout에 마운트되므로 클라이언트 라우팅(soft navigation)에는 다시 뜨지 않고 최초 1회만 뜬다.
const VISIBLE_MS = 1200 // 로고 노출 시간
const FADE_MS = 450 // 페이드아웃 시간

export default function Splash() {
  const [hidden, setHidden] = useState(false) // 페이드 시작
  const [removed, setRemoved] = useState(false) // DOM 제거

  useEffect(() => {
    // 설치형 PWA면 네이티브 스플래시가 로딩을 덮으므로 인앱 스플래시는 즉시 제거(중복 방지).
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) {
      setRemoved(true)
      return
    }
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
