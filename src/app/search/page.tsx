import type { Metadata } from 'next'
import Link from 'next/link'
import BottomTabBar from '@/components/BottomTabBar'
import SearchClient from '@/components/search/SearchClient'

export const metadata: Metadata = { title: '검색 | 책육아정원' }

export default function SearchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span className="text-base font-semibold text-text">검색</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        <SearchClient />
      </main>

      <BottomTabBar />
    </div>
  )
}
