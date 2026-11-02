import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'
import RestoreButton from '@/components/moderation/RestoreButton'
import ReportActions from '@/components/moderation/ReportActions'
import { REPORT_REASON_LABEL } from '@/lib/reports'

export const metadata: Metadata = { title: '신고·숨긴 기록 관리 | 책육아정원' }

interface ReportRow {
  post_id: string
  reason: string
  detail: string | null
  created_at: string
  post: {
    id: string
    content: string | null
    hidden_at: string | null
    book: { title: string | null } | null
    author: { nickname: string | null } | null
  } | null
}

interface HiddenPost {
  id: string
  content: string | null
  hidden_at: string
  book: { title: string | null } | null
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

  // 처리 안 된 신고 (2026.11.03) — 기록별로 묶어 최신 신고 순
  const { data: reportRows } = await supabase
    .from('reports')
    .select(
      `post_id, reason, detail, created_at,
       post:posts ( id, content, hidden_at, book:books ( title ), author:users!posts_user_id_fkey ( nickname ) )`
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  const reportGroups = new Map<string, { post: NonNullable<ReportRow['post']>; reasons: string[]; details: string[]; last: string }>()
  for (const r of (reportRows as unknown as ReportRow[] | null) ?? []) {
    if (!r.post) continue
    const g = reportGroups.get(r.post_id) ?? { post: r.post, reasons: [], details: [], last: r.created_at }
    g.reasons.push(REPORT_REASON_LABEL[r.reason] ?? r.reason)
    if (r.detail) g.details.push(r.detail)
    reportGroups.set(r.post_id, g)
  }
  const reports = [...reportGroups.values()]

  // 댓글 기능은 오픈 전 제외(2026.10) — 숨긴 기록만 관리
  const { data: postRows } = await supabase
    .from('posts')
    .select(
      `id, content, hidden_at,
       book:books ( title ),
       author:users!posts_user_id_fkey ( nickname )`
    )
    .not('hidden_at', 'is', null)
    .order('hidden_at', { ascending: false })

  const posts = (postRows as unknown as HiddenPost[] | null) ?? []
  const total = posts.length + reports.length

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="text-base font-semibold text-text">신고·숨긴 기록 관리</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-3xl">🗂️</span>
            <p className="text-sm text-text/50">신고된 기록과 숨긴 기록이 없어요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 신고된 기록 (처리 대기) */}
            {reports.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-sm font-semibold text-red-500">신고된 기록 {reports.length}</h2>
                <ul className="space-y-2">
                  {reports.map((g) => (
                    <li key={g.post.id} className="flex items-start gap-3 rounded-2xl bg-surface p-3 shadow-sm">
                      <div className="min-w-0 flex-1">
                        <Link href={`/posts/${g.post.id}`} className="text-sm font-medium text-text underline-offset-2 hover:underline">
                          {g.post.book?.title ?? '(제목 없음)'}
                        </Link>
                        <p className="mt-0.5 text-xs text-text/50">
                          {g.post.author?.nickname ?? '익명'} · 신고 {g.reasons.length}건 · {fmt(g.last)}
                          {g.post.hidden_at && ' · 이미 숨김'}
                        </p>
                        <p className="mt-1 text-xs text-red-500/80">{[...new Set(g.reasons)].join(', ')}</p>
                        {g.details.map((d, i) => (
                          <p key={i} className="mt-0.5 text-xs text-text/60">“{d}”</p>
                        ))}
                        {g.post.content && <p className="mt-1 line-clamp-2 text-xs text-text/60">{g.post.content}</p>}
                      </div>
                      <ReportActions postId={g.post.id} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

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
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
