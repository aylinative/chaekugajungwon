import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import UnblockButton from '@/components/report/UnblockButton'

export const metadata: Metadata = { title: '차단 관리 | 책육아정원', robots: { index: false } }

// 내가 차단한 사용자 목록 — 여기서 차단을 풀 수 있다 (애플 1.2, 2026.11.03)
export default async function BlocksPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data } = await supabase
    .from('user_blocks')
    .select('blocked_id, created_at, blocked:users!user_blocks_blocked_id_fkey ( nickname )')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false })
  const rows = (data as unknown as { blocked_id: string; created_at: string; blocked: { nickname: string | null } | null }[] | null) ?? []

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="flex-1 text-base font-semibold text-text">차단 관리</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-4">
        <p className="mb-3 px-1 text-xs text-text/50">차단한 사람의 기록은 나에게만 보이지 않아요. 상대방은 차단 사실을 알 수 없어요.</p>
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-text/50 shadow-sm">차단한 사용자가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.blocked_id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm">
                <span className="min-w-0 flex-1 truncate text-sm text-text">{r.blocked?.nickname ?? '(알 수 없음)'}</span>
                <UnblockButton userId={r.blocked_id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
