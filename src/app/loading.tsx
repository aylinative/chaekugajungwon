// 앱 로딩 화면 — 라우트 전환/서버 렌더 대기 중 표시(App Router Suspense fallback).
// 대표 로고 + 앱 이름. 배경은 한지 아이보리(bg).
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-192.png"
        alt="책육아정원 로고"
        width={96}
        height={96}
        className="h-24 w-24 animate-pulse"
      />
      <span className="text-lg font-bold text-main">책육아정원</span>
    </div>
  )
}
