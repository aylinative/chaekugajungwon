import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { RECOMMEND_GROUPS, AGE_LABEL_FULL, sortGroupLabelsByAge } from '@/lib/groups'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import { getBookDistribution } from '@/lib/distribution'
import { formatDate } from '@/lib/date'
import { getDistributionSummary } from '@/components/book/PeriodDistribution'
import PeriodDistribution from '@/components/book/PeriodDistribution'
import BookmarkButton from '@/components/BookmarkButton'
import RecommendButton, { ThumbIcon } from '@/components/RecommendButton'
import ShareButton from '@/components/ShareButton'
import TextDensityMeter from '@/components/TextDensityMeter'
import HidePostButton from '@/components/post/HidePostButton'
import BottomTabBar from '@/components/BottomTabBar'

// 책 단위 페이지 (CLAUDE.md 19.2) — 같은 책의 모든 기록이 한 URL에 누적된다.
// Server Component SSR 필수 (크롤러가 내용을 읽어야 함). slug는 ISBN13(books.book_key).
// 추천 시기 분포는 상시 노출 (바텀시트와 달리 이 페이지는 정보를 보러 온 사람용 — 19.2-4).
// 댓글은 기록별(comments.post_id) 유지 — 이 페이지에는 댓글 없음 (17장 결정 (가)).

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)
const LABEL_TO_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.emoji])
)

interface BookRow {
  id: string
  title: string | null
  author: string | null
  publisher: string | null
  published_date: string | null
  cover_image_url: string | null
  source_url: string | null
  is_out_of_print: boolean | null
  bookmark_count: number
}

interface BookPostRow {
  id: string
  user_id: string
  text_density: number | null
  child_reaction: number
  content: string | null
  created_at: string
  author: { nickname: string | null } | null
  post_groups: { group_name: string }[] | null
}

const POSTS_SELECT = `id, user_id, text_density, child_reaction, content, created_at,
  author:users!posts_user_id_fkey ( nickname ),
  post_groups ( group_name )`

async function getBookData(isbnParam: string) {
  const isbn = decodeURIComponent(isbnParam)
  const supabase = await createServerSupabase()
  const { data: bookRow } = await supabase
    .from('books')
    .select(
      'id, title, author, publisher, published_date, cover_image_url, source_url, is_out_of_print, bookmark_count'
    )
    .eq('book_key', isbn)
    .maybeSingle()
  return { supabase, book: bookRow as BookRow | null }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ isbn: string }>
}): Promise<Metadata> {
  const { isbn } = await params
  const { supabase, book } = await getBookData(isbn)
  if (!book?.title) return { title: '그림책 | 책육아정원' }

  const [distribution, { data: postRows }] = await Promise.all([
    getBookDistribution(supabase, book.id),
    supabase
      .from('posts')
      .select('post_groups ( group_name )')
      .eq('book_id', book.id)
      .is('hidden_at', null),
  ])

  // 타이틀의 {시기}: 표 5개 이상이면 분포의 최빈 시기, 미만이면 작성자가 고른 시기 중 가장 어린 것 (19.2-4)
  let label: string | null = null
  if (distribution.totalVoters >= 5) {
    label = getDistributionSummary(distribution.votes, distribution.totalVoters).topLabel
  }
  if (!label) {
    const authorGroups = (
      (postRows as unknown as { post_groups: { group_name: string }[] | null }[] | null) ?? []
    ).flatMap((p) => (p.post_groups ?? []).map((g) => g.group_name))
    label = sortGroupLabelsByAge([...new Set(authorGroups)])[0] ?? null
  }

  const recordCount = (postRows as unknown[] | null)?.length ?? 0
  const periodPart = label ? ` - ${label}(${AGE_LABEL_FULL[label] ?? ''})` : ''
  const title = `${book.title}${periodPart} 그림책 추천 | 책육아정원`
  const description = `${book.title} — ${recordCount}개의 책육아 기록과 추천 시기를 확인해보세요.`
  const image = book.cover_image_url ?? undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/book/${encodeURIComponent(isbn)}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

// 글밥량 대표값(최빈) — 글밥량은 책의 객관 정보라 기록 카드가 아닌 책 정보 영역에 표시
function modeOf(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => n != null)
  if (vals.length === 0) return null
  const freq = new Map<number, number>()
  vals.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1))
  let best = vals[0]
  let bestCount = 0
  for (const [n, c] of freq) {
    if (c > bestCount || (c === bestCount && n > best)) {
      best = n
      bestCount = c
    }
  }
  return best
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ isbn: string }>
}) {
  const { isbn } = await params
  const { supabase, book } = await getBookData(isbn)
  if (!book) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: postRows }, distribution, bookmarkRes] = await Promise.all([
    supabase
      .from('posts')
      .select(POSTS_SELECT)
      .eq('book_id', book.id)
      .is('hidden_at', null)
      .order('created_at', { ascending: true }), // 기록은 작성순으로 누적
    getBookDistribution(supabase, book.id),
    user
      ? supabase
          .from('bookmarks')
          .select('book_id')
          .eq('book_id', book.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const posts = (postRows as unknown as BookPostRow[] | null) ?? []
  const bookmarkedByMe = Boolean(
    (bookmarkRes.data as { book_id: string } | null)?.book_id
  )
  const pubInfo = [book.publisher, book.published_date].filter(Boolean).join(' · ')
  const densityMode = posts.length > 0 ? modeOf(posts.map((p) => p.text_density)) : null

  // 내 추천 여부 (책 단위 — 책 정보 카드의 추천 버튼 상태용) + 내가 이 책을 기록했는지(넛지용)
  let myGroups: string[] = []
  let likedByMe = false
  let hasMyRecord = false
  if (user) {
    const [{ data: myLikeRow }, { count: myRecordCount }] = await Promise.all([
      supabase
        .from('likes')
        .select('group_names')
        .eq('user_id', user.id)
        .eq('book_id', book.id)
        .maybeSingle(),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', book.id)
        .eq('user_id', user.id),
    ])
    likedByMe = Boolean(myLikeRow)
    myGroups = (myLikeRow as { group_names: string[] | null } | null)?.group_names ?? []
    hasMyRecord = (myRecordCount ?? 0) > 0
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span className="text-base font-semibold text-text">그림책</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        {/* 책 정보 */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex gap-4">
            <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
              {book.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.cover_image_url}
                  alt={book.title ?? ''}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">
                  📖
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold leading-snug text-text">
                {book.title ?? '(제목 없음)'}
              </h1>
              {book.author && <p className="mt-1 text-sm text-text/70">{book.author}</p>}
              {pubInfo && <p className="mt-0.5 text-xs text-text/50">{pubInfo}</p>}
              {/* 글밥량 대표값 — 책의 객관 정보이므로 책 정보 영역에 표시 */}
              {densityMode !== null && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs text-text/50">글밥량</span>
                  <TextDensityMeter value={densityMode} />
                </div>
              )}
              {book.is_out_of_print && (
                <span className="mt-2 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-500">
                  절판/품절
                </span>
              )}
              {book.source_url && (
                <a
                  href={book.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-main underline"
                >
                  책 정보 보기 ›
                </a>
              )}
            </div>
          </div>
          {/* 나도 추천해요(책·시기 판단) + 저장 — 둘 다 책 레벨이므로 책 정보 영역에 (2026.08) */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-3">
            {hasMyRecord ? (
              // 내가 기록한 책은 이미 추천한 것 — self-like 대신 비활성 표시(중복·해제 혼란 방지)
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-surface-muted px-2.5 py-1.5 text-xs text-text/40">
                <ThumbIcon filled size={14} />
                내가 추천한 책
              </span>
            ) : (
              <RecommendButton
                bookId={book.id}
                initialLiked={likedByMe}
                initialCount={distribution.totalVoters}
                initialGroups={myGroups}
                isLoggedIn={Boolean(user)}
                variant="detail"
              />
            )}
            <div className="flex items-center gap-2">
              <BookmarkButton
                bookId={book.id}
                initialBookmarked={bookmarkedByMe}
                initialCount={book.bookmark_count ?? 0}
                isLoggedIn={Boolean(user)}
                variant="detail"
              />
              <ShareButton
                path={`/book/${encodeURIComponent(isbn)}`}
                title={`${book.title ?? '그림책'} | 책육아정원`}
                text={`${book.title ?? '그림책'} — 아이와 함께 읽은 기록과 추천 시기`}
              />
            </div>
          </div>
        </section>

        {/* 추천 시기 분포 — 상시 노출 (19.2-4) */}
        <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text">추천 시기 분포</h2>
          <PeriodDistribution
            votes={distribution.votes}
            totalVoters={distribution.totalVoters}
          />
        </section>

        {/* 책육아 기록 누적 (작성순) */}
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">
            책육아 기록 {posts.length > 0 && `${posts.length}`}
          </h2>
          {posts.length === 0 ? (
            <div className="rounded-2xl bg-surface px-6 py-10 text-center shadow-sm">
              <p className="text-sm text-text/50">아직 기록이 없어요.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => {
                const groups = sortGroupLabelsByAge(
                  (p.post_groups ?? []).map((g) => g.group_name)
                )
                const reaction = REACTION_BY_VALUE[p.child_reaction]
                return (
                  <li
                    key={p.id}
                    className="overflow-hidden rounded-2xl bg-surface shadow-sm"
                  >
                    {/* 기록 카드 = 양육자의 평가 전용 (반응·시기·일기).
                        글밥량은 책 정보 영역에, 추천(책·시기 판단)도 책 정보 영역에 (2026.08).
                        세부 페이지(/posts/[id])는 댓글 진입·공유 링크용. */}
                    <Link href={`/posts/${p.id}`} className="block p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-text">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-main/10 text-xs">
                            🌿
                          </span>
                          {p.author?.nickname ?? '익명'}
                        </span>
                        <span className="ml-auto text-xs text-text/40">
                          {formatDate(p.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {groups.map((g) => (
                          <span
                            key={g}
                            aria-label={g}
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                              LABEL_TO_BADGE[g] ?? 'bg-surface-muted'
                            }`}
                          >
                            {LABEL_TO_EMOJI_MAP[g] ?? g}
                          </span>
                        ))}
                        {reaction && (
                          <span className="text-[11px] font-medium text-point">
                            {reaction.emoji} {reaction.label}
                          </span>
                        )}
                      </div>

                      {p.content && (
                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-text/80">
                          {p.content}
                        </p>
                      )}
                    </Link>
                    {/* 작성자 본인에게만 수정/삭제 (삭제는 소프트, stay=그 자리 새로고침) */}
                    {user?.id === p.user_id && (
                      <div className="flex justify-end gap-3 border-t border-black/5 px-4 py-1.5">
                        <Link
                          href={`/recommend/create?edit=${p.id}`}
                          className="text-xs text-text/40"
                        >
                          수정
                        </Link>
                        <HidePostButton
                          postId={p.id}
                          label="삭제"
                          confirmText="이 기록을 삭제할까요? 목록에서 보이지 않게 됩니다."
                          stay
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* 기여 넛지(벽 아님): 이 책을 아직 기록하지 않은 로그인 유저에게만. */}
        {user && !hasMyRecord && (
          <section className="mt-4 rounded-2xl bg-main/10 p-5 text-center">
            <p className="text-sm font-semibold text-main">
              이 책, 아이와 읽어보셨어요?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text/60">
              우리 아이 반응을 기록하면 같은 시기 양육자들에게 큰 도움이 돼요.
            </p>
            <Link
              href={`/recommend/create?query=${encodeURIComponent(book.title ?? '')}`}
              className="mt-3 inline-block rounded-xl bg-main px-4 py-2 text-sm font-medium text-white"
            >
              기록 남기기
            </Link>
          </section>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
