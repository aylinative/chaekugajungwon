import type { Metadata } from 'next'
import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { AGE_LABEL_FULL, sortGroupLabelsByAge } from '@/lib/groups'
import { computeBookDistribution } from '@/lib/distribution'
import {
  getDistributionSummary,
  MIN_VOTERS_FOR_DISTRIBUTION,
} from '@/components/book/PeriodDistribution'
import PeriodDistribution from '@/components/book/PeriodDistribution'
import BookSwipeNav from '@/components/book/BookSwipeNav'
import RecordCard from '@/components/book/RecordCard'
import ExpandableRecords from '@/components/book/ExpandableRecords'
import RecordSwipeRow from '@/components/book/RecordSwipeRow'
import { groupByAuthor, readOrderById } from '@/lib/readOrder'
import BookTopics, { type TopicLink } from '@/components/book/BookTopics'
import BookIntro from '@/components/book/BookIntro'
import { isYes24Book } from '@/lib/bookSource'
import BookmarkButton from '@/components/BookmarkButton'
import WishMemoNote from '@/components/book/WishMemoNote'
import RecommendButton, { ThumbIcon } from '@/components/RecommendButton'
import ShareButton from '@/components/ShareButton'
import TextDensityMeter from '@/components/TextDensityMeter'
import BottomTabBar from '@/components/BottomTabBar'

// 책 단위 페이지 (CLAUDE.md 19.2) — 같은 책의 모든 기록이 한 URL에 누적된다.
// Server Component SSR 필수 (크롤러가 내용을 읽어야 함). slug는 ISBN13(books.book_key).
// 추천 시기 분포는 상시 노출 (바텀시트와 달리 이 페이지는 정보를 보러 온 사람용 — 19.2-4).
// 댓글 기능은 오픈 전 제외(2026.10, CLAUDE.md 12장).


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
  description?: string | null // 책 소개 — books.description 칸이 생긴 뒤부터 (data 탭, 2026.11.17)
}

interface BookPostRow {
  id: string
  user_id: string
  text_density: number | null
  child_reaction: number
  content: string | null
  created_at: string
  diary_date: string | null
  author: { nickname: string | null } | null
  post_groups: { group_name: string }[] | null
  post_tags:
    | {
        custom_tag: string | null
        is_operator_tag: boolean
        operator_tags: { id: string; slug: string | null; name: string; level: string; parent_id: string | null; tag_category: string | null } | null
      }[]
    | null
}

const POSTS_SELECT = `id, user_id, text_density, child_reaction, content, created_at, diary_date,
  author:users!posts_user_id_fkey ( nickname ),
  post_groups ( group_name ),
  post_tags ( custom_tag, is_operator_tag, operator_tags ( id, slug, name, level, parent_id, tag_category ) )`

// React cache() — generateMetadata와 본문이 같은 요청 안에서 조회를 공유(중복 제거).
// 캐시 키는 원시값(isbn/bookId)만 — supabase 클라이언트를 인자로 넘기면 매번 달라 중복제거가 안 됨.
const getBook = cache(async (isbnParam: string): Promise<BookRow | null> => {
  const isbn = decodeURIComponent(isbnParam)
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('books')
    // '*' — description 칸이 아직 없는 DB에서도 오류 없이(있으면 함께) 읽기 위해
    .select('*')
    .eq('book_key', isbn)
    .maybeSingle()
  return data as BookRow | null
})

const getBookPosts = cache(async (bookId: string): Promise<BookPostRow[]> => {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('posts')
    .select(POSTS_SELECT)
    .eq('book_id', bookId)
    .is('hidden_at', null)
    .order('created_at', { ascending: false }) // 기록은 최신순 (2026.11.14 운영자 — 작성순에서 변경)
  return (data as unknown as BookPostRow[] | null) ?? []
})

const getBookLikes = cache(
  async (bookId: string): Promise<{ user_id: string; group_names: string[] | null }[]> => {
    const supabase = await createServerSupabase()
    const { data } = await supabase
      .from('likes')
      .select('user_id, group_names')
      .eq('book_id', bookId)
    return (data as { user_id: string; group_names: string[] | null }[] | null) ?? []
  }
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ isbn: string }>
}): Promise<Metadata> {
  const { isbn } = await params
  const book = await getBook(isbn)
  if (!book?.title) return { title: '그림책 | 책육아정원' }

  const [posts, likes] = await Promise.all([getBookPosts(book.id), getBookLikes(book.id)])
  const distribution = computeBookDistribution(likes, posts)

  // 타이틀의 {시기}: 표 5개 이상이면 분포의 최빈 시기, 미만이면 작성자가 고른 시기 중 가장 어린 것 (19.2-4)
  let label: string | null = null
  if (distribution.totalVoters >= MIN_VOTERS_FOR_DISTRIBUTION) {
    label = getDistributionSummary(distribution.votes, distribution.totalVoters).topLabel
  }
  if (!label) {
    const authorGroups = posts.flatMap((p) => (p.post_groups ?? []).map((g) => g.group_name))
    label = sortGroupLabelsByAge([...new Set(authorGroups)])[0] ?? null
  }

  const recordCount = posts.length
  const periodPart = label ? ` - ${label}(${AGE_LABEL_FULL[label] ?? ''})` : ''
  const title = `${book.title}${periodPart} 그림책 추천 | 책육아정원`
  const description = `${book.title} — ${recordCount}개의 책육아 기록과 추천 시기를 확인해보세요.`
  const image = book.cover_image_url ?? undefined

  return {
    title,
    description,
    // canonical을 실서비스 도메인 기준 상대경로로 고정(metadataBase가 절대 URL로 해석) →
    // 베타 도메인에서 크롤링돼도 검색 신호가 커스텀 도메인으로 통합됨 (중복 방지)
    alternates: { canonical: `/book/${encodeURIComponent(isbn)}` },
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

// 책의 모든 기록에서 사용된 주제 태그 합산 → 사용 빈도 많은 순 정렬.
// 표시 규칙(work_order_part3 Step 3): 기록마다 세부가 있으면 세부 이름만(그 주제는 생략), 숨김(개편 전) 태그도 표시.
// 커스텀 태그(옛 직접 입력)는 운영자 태그의 큰 분류명·이름과 겹치면 드롭(예: 커스텀 '가족' + '엄마'(가족) → '엄마'만).
// slug가 있으면 홈 필터로 이동(?tag=slug), 커스텀 태그는 링크 없음.
function aggregateTopics(posts: BookPostRow[]): TopicLink[] {
  const opFreq = new Map<string, { slug: string | null; count: number }>()
  const categories = new Set<string>()
  const customFreq = new Map<string, number>()
  for (const p of posts) {
    const ops = (p.post_tags ?? []).flatMap((t) => (t.is_operator_tag && t.operator_tags ? [t.operator_tags] : []))
    const parentsWithDetail = new Set(ops.filter((o) => o.level === 'detail' && o.parent_id).map((o) => o.parent_id))
    for (const o of ops) {
      if (o.level === 'topic' && parentsWithDetail.has(o.id)) continue // 세부가 있으면 주제 생략
      const cur = opFreq.get(o.name)
      opFreq.set(o.name, { slug: o.slug, count: (cur?.count ?? 0) + 1 })
      if (o.tag_category) categories.add(o.tag_category)
    }
    for (const t of p.post_tags ?? []) {
      if (!t.is_operator_tag && t.custom_tag) customFreq.set(t.custom_tag, (customFreq.get(t.custom_tag) ?? 0) + 1)
    }
  }
  const merged: { name: string; slug: string | null; count: number }[] = [...opFreq].map(([name, v]) => ({
    name,
    slug: v.slug,
    count: v.count,
  }))
  for (const [name, count] of customFreq) {
    if (!categories.has(name) && !opFreq.has(name)) merged.push({ name, slug: null, count })
  }
  return merged
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map(({ name, slug }) => ({ name, slug }))
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ isbn: string }>
}) {
  const { isbn } = await params
  const book = await getBook(isbn)
  if (!book) notFound()

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [posts, likes, bookmarkRes] = await Promise.all([
    getBookPosts(book.id), // generateMetadata와 공유(React cache) — 중복 조회 없음
    getBookLikes(book.id),
    user
      ? supabase
          .from('bookmarks')
          .select('book_id')
          .eq('book_id', book.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const distribution = computeBookDistribution(likes, posts)
  // 재독 — 사람별 묶음·순번, 내 가장 최근 기록('또 읽었어요'가 이 기록 값으로 채움)
  const recordGroups = groupByAuthor(posts)
  const readOrder = readOrderById(posts)
  const myLatestPostId = user ? recordGroups.find((g) => g[0].user_id === user.id)?.[0].id ?? null : null
  const bookmarkedByMe = Boolean(
    (bookmarkRes.data as { book_id: string } | null)?.book_id
  )
  // 저장한 책의 '추천이유' 메모(본인만) — 따로 조회해서, 칸이 없거나 실패해도 저장 표시는 그대로 (2026.11.20)
  let myWishMemo = ''
  if (user && bookmarkedByMe) {
    const { data: memoRow } = await supabase
      .from('bookmarks')
      .select('memo')
      .eq('book_id', book.id)
      .eq('user_id', user.id)
      .maybeSingle()
    myWishMemo = (memoRow as { memo: string | null } | null)?.memo ?? ''
  }
  const pubInfo = [book.publisher, book.published_date].filter(Boolean).join(' · ')
  const densityMode = posts.length > 0 ? modeOf(posts.map((p) => p.text_density)) : null
  const topics = aggregateTopics(posts)

  // 내 추천 여부 (책 단위 — 책 정보 카드의 추천 버튼 상태용) + 내가 이 책을 기록했는지(넛지용)
  let myGroups: string[] = []
  let likedByMe = false
  let hasMyRecord = false
  let blockedIds = new Set<string>() // 내가 차단한 사람 — 그 사람의 기록 카드는 나에게만 가림(불투명 커버, 2026.11.03)
  if (user) {
    const [{ data: myLikeRow }, { count: myRecordCount }, { data: blockRows }] = await Promise.all([
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
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id),
    ])
    blockedIds = new Set(((blockRows as { blocked_id: string }[] | null) ?? []).map((r) => r.blocked_id))
    likedByMe = Boolean(myLikeRow)
    myGroups = (myLikeRow as { group_names: string[] | null } | null)?.group_names ?? []
    hasMyRecord = (myRecordCount ?? 0) > 0
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 pb-3 pt-safe-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span className="text-base font-semibold text-text">그림책</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        {/* 책 정보 — 홈 시기 섹션·더보기에서 들어오면 좌우로 밀어 같은 목록의 이전/다음 책 */}
        <BookSwipeNav isbn={isbn}>
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex gap-4">
            <div className="h-32 w-24 flex-shrink-0">
              <div className="h-full w-full overflow-hidden rounded-lg bg-surface-muted">
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
              {/* 저장한 본인에게만 — '추천이유' 메모 (오른쪽 빈 칸, 내용 길이만큼) */}
              {user && <WishMemoNote bookId={book.id} initialBookmarked={bookmarkedByMe} initialMemo={myWishMemo} />}
            </div>
          </div>
          {/* 책 소개 2줄 + 더보기, 예스24 책이면 출처 — 구분선 위(책 정보 묶음의 끝) (2026.11.17) */}
          <BookIntro
            description={book.description ?? null}
            sourceUrl={book.source_url}
            fromYes24={isYes24Book(book.source_url)}
          />
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
        </BookSwipeNav>

        {/* 주제 — 이 책의 모든 기록에서 합산(빈도순). 없으면 렌더 안 함. 칩 클릭 시 홈 필터(?tag=) */}
        <BookTopics topics={topics} />

        {/* 추천 시기 분포 — 추천한 사람(중복 제거)이 기준 수 이상일 때만 영역째 노출 (19.2-4) */}
        {distribution.totalVoters >= MIN_VOTERS_FOR_DISTRIBUTION && (
          <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-text">추천 시기 분포</h2>
            <PeriodDistribution
              votes={distribution.votes}
              totalVoters={distribution.totalVoters}
            />
          </section>
        )}

        {/* 책육아 기록 (최신순) — 처음엔 3개, 더 있으면 아래 '펼쳐보기' (2026.11.14) */}
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">
            책육아 기록 {posts.length > 0 && `${posts.length}`}
          </h2>
          {posts.length === 0 ? (
            <div className="rounded-2xl bg-surface px-6 py-10 text-center shadow-sm">
              <p className="text-sm text-text/50">아직 기록이 없어요.</p>
            </div>
          ) : (
            // 사람별로 묶고(최근 읽은 순), 같은 사람의 재독은 한 줄에서 가로로 넘김 — 최신 회차 먼저 (2026.11.23)
            <ExpandableRecords
              items={recordGroups.map((group) =>
                group.length === 1 || blockedIds.has(group[0].user_id) ? (
                  <RecordCard
                    key={group[0].id}
                    post={group[0]}
                    order={readOrder.get(group[0].id)}
                    viewerId={user?.id ?? null}
                    blocked={blockedIds.has(group[0].user_id)}
                    from={`/book/${encodeURIComponent(isbn)}`}
                  />
                ) : (
                  <RecordSwipeRow
                    key={group[0].id}
                    cards={group.map((p) => (
                      <RecordCard
                        key={p.id}
                        as="div"
                        post={p}
                        order={readOrder.get(p.id)}
                        viewerId={user?.id ?? null}
                        blocked={false}
                        from={`/book/${encodeURIComponent(isbn)}`}
                      />
                    ))}
                  />
                )
              )}
            />
          )}
        </section>

        {/* 기여 넛지(벽 아님): 기록한 사람에겐 '또 읽었어요'(재독 기록, 2026.11.23 운영자 — 별로면 뺄 수 있음) */}
        {user && myLatestPostId && (
          <section className="mt-4 rounded-2xl bg-surface-muted p-5 text-center">
            <p className="text-sm font-semibold text-text/80">또 읽으셨나요?</p>
            <p className="mt-1 text-xs leading-relaxed text-text/60">오늘 아이와 다시 읽은 이야기를 남겨 보세요.</p>
            <Link
              href={`/recommend/create?again=${myLatestPostId}`}
              className="mt-3 inline-block rounded-xl bg-surface px-4 py-2 text-sm font-medium text-text/70"
            >
              또 읽었어요
            </Link>
          </section>
        )}
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
              href={`/recommend/create?book=${encodeURIComponent(decodeURIComponent(isbn))}`}
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
