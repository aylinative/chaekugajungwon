import Link from 'next/link'
import BottomTabBar from '@/components/BottomTabBar'

// 없는 주소 안내 (2026.11.20) — Next 기본 영어 404 대신. 통합·삭제된 책 주소(예: 옛 ISBN)로 들어와도 여기로.
// 검색 제외(noindex)는 Next가 notFound 응답에 자동으로 붙인다.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center border-b border-black/5 bg-bg/90 px-4 pb-3 pt-safe-3 backdrop-blur">
        <span className="text-base font-semibold text-text">책육아정원</span>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-4xl" aria-hidden>
          📖
        </p>
        <h1 className="mt-4 text-base font-semibold text-text">찾는 페이지가 없어요</h1>
        <p className="mt-2 text-sm leading-relaxed text-text/55">
          주소가 바뀌었거나 정리된 페이지예요.
          <br />
          책 제목으로 다시 찾아보세요.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/search" className="rounded-full bg-main px-5 py-2.5 text-sm font-medium text-white">
            책 검색
          </Link>
          <Link href="/" className="rounded-full bg-surface-muted px-5 py-2.5 text-sm font-medium text-text/70">
            홈으로
          </Link>
        </div>
      </main>
      <BottomTabBar />
    </div>
  )
}
