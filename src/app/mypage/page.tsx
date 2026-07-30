import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { RECOMMEND_GROUPS, LABEL_TO_EMOJI } from '@/lib/groups'
import BottomTabBar from '@/components/BottomTabBar'
import ProfileEditor from '@/components/mypage/ProfileEditor'

export const metadata: Metadata = { title: '마이페이지 | 책육아정원' }

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)

interface MyPostRow {
  id: string
  created_at: string
  book_id: string
  book: { title: string | null; cover_image_url: string | null } | null
  post_groups: { group_name: string }[] | null
  likes: { count: number }[] | null
}

export default async function MyPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [meRes, childRes, postRes] = await Promise.all([
    supabase.from('users').select('nickname').eq('id', user.id).maybeSingle(),
    supabase
      .from('children')
      .select('birth_date')
      .eq('user_id', user.id)
      .order('birth_date', { ascending: true }),
    supabase
      .from('posts')
      .select(
        `id, created_at, book_id,
         book:books ( title, cover_image_url ),
         post_groups ( group_name ),
         likes ( count )`
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  // 진단용: 아이 조회가 실패하는지 / 몇 건 오는지 서버 콘솔에 남김
  if (childRes.error) {
    console.error('[mypage] children fetch error:', childRes.error)
  } else {
    console.log(
      `[mypage] user=${user.id} children=${childRes.data?.length ?? 0}건`
    )
  }

  const nickname = (meRes.data as { nickname: string | null } | null)?.nickname ?? ''
  const childRows = childRes.data
  const postRows = postRes.data
  const children = ((childRows as { birth_date: string }[] | null) ?? []).map((c) => ({
    birth_date: c.birth_date,
  }))
  const posts = (postRows as unknown as MyPostRow[] | null) ?? []

  // 독서 통계
  const totalRecords = posts.length // 함께 읽은 기록(추천 게시물) 수
  const distinctBooks = new Set(posts.map((p) => p.book_id)).size // 추천한 책(중복 제외) 수

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <span className="text-base font-semibold text-text">마이페이지</span>
        <a href="/api/auth/logout" className="text-xs text-text/40">
          로그아웃
        </a>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-24 pt-4">
        {/* 프로필 (닉네임 + 아이 정보 편집) */}
        <ProfileEditor initialNickname={nickname} initialChildren={children} />

        {/* 독서 통계 */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-main">{distinctBooks}</p>
            <p className="mt-1 text-xs text-text/50">함께 읽은 책</p>
          </div>
          <div className="rounded-2xl bg-surface p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-point">{totalRecords}</p>
            <p className="mt-1 text-xs text-text/50">함께 읽은 기록</p>
          </div>
        </section>

        {/* 책육아 기록 */}
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">책육아 기록</h2>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-12 text-center shadow-sm">
              <span className="text-3xl">🌱</span>
              <p className="text-sm text-text/50">아직 기록한 책이 없어요.</p>
              <Link
                href="/recommend/create"
                className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white"
              >
                첫 기록하기
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => {
                const groups = (p.post_groups ?? []).map((g) => g.group_name)
                const likeCount = p.likes?.[0]?.count ?? 0
                const date = new Date(p.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
                return (
                  <li key={p.id}>
                    <Link
                      href={`/posts/${p.id}`}
                      className="flex gap-3 rounded-2xl bg-surface p-3 shadow-sm"
                    >
                      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                        {p.book?.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.book.cover_image_url}
                            alt={p.book.title ?? ''}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg">
                            📖
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="line-clamp-2 text-sm font-medium text-text">
                          {p.book?.title ?? '(제목 없음)'}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {groups.map((g) => (
                            <span
                              key={g}
                              aria-label={g}
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                                LABEL_TO_BADGE[g] ?? 'bg-surface-muted'
                              }`}
                            >
                              {LABEL_TO_EMOJI[g] ?? g}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-text/40">
                          <span>{date}</span>
                          <span className="flex items-center gap-0.5">
                            <span className="text-point">♥</span>
                            {likeCount}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      <BottomTabBar />
    </div>
  )
}
