import Link from 'next/link'
import BottomTabBar from '@/components/BottomTabBar'

// 아직 구현 예정인 화면용 임시 플레이스홀더.
export default function ComingSoon({
  title,
  emoji = '🌿',
}: {
  title: string
  emoji?: string
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span className="text-base font-semibold text-text">{title}</span>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-4xl">{emoji}</span>
        <p className="text-sm text-text/50">준비 중인 화면이에요.</p>
      </main>
      <BottomTabBar />
    </div>
  )
}
