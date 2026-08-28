import Link from 'next/link'

// 홈 피드 상단 고정 헤더: 로고 + 검색 아이콘
export default function FeedHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="책육아정원 로고" width={24} height={24} className="h-6 w-6" />
        <span className="text-base font-bold text-main">책육아정원</span>
      </Link>
      <Link href="/search" aria-label="검색" className="p-1 text-text/60">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </Link>
    </header>
  )
}
