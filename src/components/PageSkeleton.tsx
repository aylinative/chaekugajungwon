import Link from 'next/link'
import BottomTabBar from '@/components/BottomTabBar'

// 페이지 이동 중 뼈대 화면(loading.tsx 공용). 표지·카드를 누르는 즉시 화면이 넘어가 '눌렸다'는 피드백을 주고,
// 서버 응답을 기다리는 동안 연타하지 않게 한다. Next는 이 뼈대를 미리 받아 두므로 탭 직후 바로 표시된다.
// 실제 페이지와 같은 헤더·여백을 써서 전환 시 화면이 튀지 않게 한다.

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-muted ${className}`} />
}

function BookInfoCard() {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <div className="flex gap-4">
        <Block className="h-32 w-24 flex-shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2 pt-1">
          <Block className="h-5 w-3/4" />
          <Block className="h-4 w-1/3" />
          <Block className="h-3 w-1/2" />
        </div>
      </div>
    </section>
  )
}

export default function PageSkeleton({
  title,
  variant,
}: {
  title?: string
  variant: 'book' | 'post' | 'grid'
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        {title ? (
          <span className="text-base font-semibold text-text">{title}</span>
        ) : (
          <Block className="h-5 w-24" />
        )}
      </header>

      <main
        role="status"
        aria-label="불러오는 중"
        className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4"
      >
        {variant === 'book' && (
          <div className="space-y-4">
            <BookInfoCard />
            <section className="rounded-2xl bg-surface p-4 shadow-sm">
              <Block className="mb-3 h-4 w-24" />
              <Block className="h-24 w-full" />
            </section>
            {[0, 1].map((i) => (
              <section key={i} className="space-y-2 rounded-2xl bg-surface p-4 shadow-sm">
                <Block className="h-4 w-1/3" />
                <Block className="h-3 w-full" />
                <Block className="h-3 w-2/3" />
              </section>
            ))}
          </div>
        )}

        {variant === 'post' && (
          <div className="space-y-4">
            <BookInfoCard />
            <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
              <Block className="h-5 w-1/2" />
              <Block className="h-4 w-1/3" />
              <Block className="h-16 w-full rounded-xl" />
            </section>
          </div>
        )}

        {variant === 'grid' && (
          <div>
            <div className="mb-3 flex gap-2 overflow-hidden">
              {[0, 1, 2, 3].map((i) => (
                <Block key={i} className="h-7 w-16 flex-shrink-0 rounded-full" />
              ))}
            </div>
            <div className="mb-3 flex justify-between">
              <Block className="h-5 w-24" />
              <Block className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-5">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Block className="aspect-[3/4] w-full rounded-xl" />
                  <Block className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
