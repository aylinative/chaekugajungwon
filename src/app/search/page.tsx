import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'
import SearchClient from '@/components/search/SearchClient'

export const metadata: Metadata = { title: '검색 | 책육아정원' }

export default async function SearchPage() {
  // 첫 기록 게이트(11.4): 콘텐츠 소비 입구(홈·검색)는 기록 1건 이후에 열린다
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) === 0) {
      redirect('/recommend/create?first=1')
    }
  }

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
