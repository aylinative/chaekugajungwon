import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'
import RestoreButton from '@/components/moderation/RestoreButton'

export const metadata: Metadata = { title: '숨긴 기록 관리 | 책육아정원' }

interface HiddenPost {
  id: string
  content: string | null
  hidden_at: string
  book: { title: string | null } | null
  author: { nickname: string | null } | null
}
interface HiddenComment {
  id: string
  content: string
  hidden_at: string
  author: { nickname: string | null } | null
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

export default async function ModerationPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 운영자 전용 — 아니면 홈으로
  if (!user || !(await getIsOperator(supabase, user.id))) {
    redirect('/')
  }

  const [{ data: postRows }, { data: commentRows }] = await Promise.all([
    supabase
      .from('posts')
      .select(
        `id, content, hidden_at,
         book:books ( title ),
         author:users!posts_user_id_fkey ( nickname )`
      )
      .not('hidden_at', 'is', null)
      .order('hidden_at', { ascending: false }),
    supabase
      .from('comments')
      .select('id, content, hidden_at, author:users!comments_user_id_fkey ( nickname )')
      .not('hidden_at', 'is', null)
      .order('hidden_at', { ascending: false }),
  ])

  const posts = (postRows as unknown as HiddenPost[] | null) ?? []
  const comments = (commentRows as unknown as HiddenComment[] | null) ?? []
  const total = posts.length + comments.length

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="text-base font-semibold text-text">숨긴 기록 관리</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-3xl">🗂️</span>
            <p className="text-sm text-text/50">숨긴 기록이 없어요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 숨긴 게시물 */}
            {posts.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-sm font-semibold text-text">
                  숨긴 기록 {posts.length}
                </h2>
                <ul className="space-y-2">
                  {posts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 rounded-2xl bg-surface p-3 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text">
                          {p.book?.title ?? '(제목 없음)'}
                        </p>
                        <p className="mt-0.5 text-xs text-text/50">
                          {p.author?.nickname ?? '익명'} · {fmt(p.hidden_at)} 숨김
                        </p>
                        {p.content && (
                          <p className="mt-1 line-clamp-2 text-xs text-text/60">
                            {p.content}
                          </p>
                        )}
                      </div>
                      <RestoreButton type="post" id={p.id} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 숨긴 댓글 */}
            {comments.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-sm font-semibold text-text">
                  숨긴 댓글 {comments.length}
                </h2>
                <ul className="space-y-2">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-start gap-3 rounded-2xl bg-surface p-3 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text/50">
                          {c.author?.nickname ?? '익명'} · {fmt(c.hidden_at)} 숨김
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-text/70">{c.content}</p>
                      </div>
                      <RestoreButton type="comment" id={c.id} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
