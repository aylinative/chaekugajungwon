import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import { RECOMMEND_GROUPS, LABEL_TO_EMOJI, sortGroupLabelsByAge, AGE_LABEL_FULL } from '@/lib/groups'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import { formatDate } from '@/lib/date'
import { getBookDistribution } from '@/lib/distribution'
import BookmarkButton from '@/components/BookmarkButton'
import RecommendButton, { ThumbIcon } from '@/components/RecommendButton'
import TextDensityMeter from '@/components/TextDensityMeter'
import BottomTabBar from '@/components/BottomTabBar'
import PostActionsMenu from '@/components/post/PostActionsMenu'
import UnblockButton from '@/components/report/UnblockButton'

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)

interface RawDetail {
  id: string
  text_density: number | null
  child_reaction: number
  content: string | null
  created_at: string
  user_id: string
  book: {
    id: string
    title: string | null
    author: string | null
    publisher: string | null
    published_date: string | null
    cover_image_url: string | null
    source_url: string | null
    is_out_of_print: boolean | null
    bookmark_count: number
  } | null
  author: { nickname: string | null } | null
  post_groups: { group_name: string }[] | null
  post_tags:
    | {
        custom_tag: string | null
        is_operator_tag: boolean
        operator_tags: { id: string; name: string; level: string; parent_id: string | null } | null
      }[]
    | null
  post_images: { image_url: string; sort_order: number }[] | null
}

const DETAIL_SELECT = `id, text_density, child_reaction, content, created_at, user_id,
  book:books ( id, title, author, publisher, published_date, cover_image_url, source_url, is_out_of_print, bookmark_count ),
  author:users!posts_user_id_fkey ( nickname ),
  post_groups ( group_name ),
  post_tags ( custom_tag, is_operator_tag, operator_tags ( id, name, level, parent_id ) ),
  post_images ( image_url, sort_order )`

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('posts')
    .select('book:books(title, cover_image_url), post_groups(group_name)')
    .eq('id', id)
    .is('hidden_at', null)
    .maybeSingle()

  const raw = data as unknown as {
    book: { title: string | null; cover_image_url: string | null } | null
    post_groups: { group_name: string }[] | null
  } | null

  const bookTitle = raw?.book?.title
  if (!bookTitle) return { title: '게시물 | 책육아정원' }
  // 시기가 여러 개면 연령 오름차순 첫 번째(가장 어린 시기) — 책 페이지 규칙과 일관.
  // 개월범위를 함께 표기(책 페이지 title과 동일 형식): "꽃잎(19~30개월)"
  const group = sortGroupLabelsByAge((raw?.post_groups ?? []).map((g) => g.group_name))[0]
  const ageFull = group ? AGE_LABEL_FULL[group] : undefined
  const groupPart = group ? ` - ${group}${ageFull ? `(${ageFull})` : ''}` : ''
  const title = `${bookTitle}${groupPart} 그림책 추천 | 책육아정원`
  const description = `${bookTitle} 그림책을 아이와 함께 읽은 기록과 추천.`
  const image = raw?.book?.cover_image_url ?? undefined

  return {
    title,
    description,
    alternates: { canonical: `/posts/${id}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/posts/${id}`,
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

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const { data: postData } = await supabase
    .from('posts')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .is('hidden_at', null)
    .maybeSingle()

  if (!postData) notFound()
  const post = postData as unknown as RawDetail

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOperator = await getIsOperator(supabase, user?.id)
  const isOwner = Boolean(user && user.id === post.user_id)
  const canModeratePost = isOwner || isOperator // 게시물 숨김 권한
  // 내가 차단한 사람의 기록이면 내용 대신 안내(애플 1.2 차단 — 나에게만 안 보임, 2026.11.03)
  let isBlocked = false
  if (user && !isOwner) {
    const { data: block } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', post.user_id)
      .maybeSingle()
    isBlocked = Boolean(block)
  }

  // '나도 추천해요'·저장 — 책 단위(likes·bookmarks.book_id)라 책 페이지·홈 카드와 같은 데이터.
  // 공유 링크로 들어온 사람이 바로 누를 수 있게 기록 상세에도 둔다(2026.11 재도입).
  // 추천 수는 책 페이지와 동일하게 분포 모수(추천+기록자, 유저별 합집합)를 쓴다.
  const bookId = post.book?.id
  let recommendCount = 0
  let likedByMe = false
  let myGroups: string[] = []
  let bookmarkedByMe = false
  let hasMyRecord = isOwner
  if (bookId) {
    const [distribution, myLikeRes, myBookmarkRes, myRecordRes] = await Promise.all([
      getBookDistribution(supabase, bookId),
      user
        ? supabase.from('likes').select('group_names').eq('user_id', user.id).eq('book_id', bookId).maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase.from('bookmarks').select('book_id').eq('user_id', user.id).eq('book_id', bookId).maybeSingle()
        : Promise.resolve({ data: null }),
      // 이 기록의 작성자가 아니어도 같은 책을 따로 기록했을 수 있다(책 페이지와 같은 판정)
      user && !isOwner
        ? supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', bookId)
            .eq('user_id', user.id)
        : Promise.resolve({ count: 0 }),
    ])
    recommendCount = distribution.totalVoters
    likedByMe = Boolean(myLikeRes.data)
    myGroups = (myLikeRes.data as { group_names: string[] | null } | null)?.group_names ?? []
    bookmarkedByMe = Boolean((myBookmarkRes.data as { book_id: string } | null)?.book_id)
    hasMyRecord = isOwner || (myRecordRes.count ?? 0) > 0
  }

  const book = post.book
  const groups = sortGroupLabelsByAge((post.post_groups ?? []).map((g) => g.group_name))
  // 세부가 있으면 세부 이름만(그 주제는 생략), 숨김(개편 전) 태그도 그대로 표시 — work_order_part3 Step 3
  const tagRows = post.post_tags ?? []
  const parentsWithDetail = new Set(
    tagRows.map((t) => t.operator_tags).filter((o) => o?.level === 'detail' && o.parent_id).map((o) => o!.parent_id)
  )
  const topics = tagRows
    .filter((t) => !(t.operator_tags?.level === 'topic' && parentsWithDetail.has(t.operator_tags.id)))
    .map((t) => (t.is_operator_tag ? t.operator_tags?.name : t.custom_tag))
    .filter((t): t is string => Boolean(t))
  const images = (post.post_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  const pubInfo = [book?.publisher, book?.published_date].filter(Boolean).join(' · ')

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span className="flex-1 text-base font-semibold text-text">책육아 기록</span>
        {/* 수정/공유/삭제(숨김)를 ⋯ 메뉴로 통합. 작성자='삭제', 운영자 타인글='숨김' */}
        <PostActionsMenu
          postId={post.id}
          sharePath={`/posts/${id}`}
          shareTitle={`${book?.title ?? '그림책'} | 책육아정원`}
          shareText={`${book?.title ?? '그림책'} — 아이와 함께 읽은 기록`}
          canEdit={false}
          canModerate={canModeratePost}
          moderateLabel={isOwner ? '삭제' : '숨김'}
          report={user && !isOwner ? { authorId: post.user_id, authorNickname: post.author?.nickname ?? null } : undefined}
          moderateConfirm={
            isOwner
              ? '이 기록을 삭제할까요? 목록에서 보이지 않게 됩니다.'
              : '이 기록을 숨길까요? 목록에서 보이지 않게 됩니다.'
          }
        />
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        {/* ① 책 정보 영역 */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex gap-4">
            <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
              {book?.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.cover_image_url}
                  alt={book.title ?? ''}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">📖</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold leading-snug text-text">
                {book?.title ?? '(제목 없음)'}
              </h1>
              {book?.author && (
                <p className="mt-1 text-sm text-text/70">{book.author}</p>
              )}
              {pubInfo && <p className="mt-0.5 text-xs text-text/50">{pubInfo}</p>}
              {book?.is_out_of_print && (
                <span className="mt-2 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-500">
                  절판/품절
                </span>
              )}
              {/* ⚠️ 아이 나이는 표시하지 않는다 — 기록 시점 기준이라 실제 읽은 시기와
                  다를 수 있어 잘못된 정보가 된다. 시기 배지(②)가 그 역할을 한다. (10.1) */}
              {book?.source_url && (
                <a
                  href={book.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs text-main underline"
                >
                  책 정보 보기 ›
                </a>
              )}
            </div>
          </div>
          {/* 나도 추천해요 + 저장 — 책 페이지 책 정보 영역과 동일(책 단위). 공유는 상단 ⋯ 메뉴 */}
          {bookId && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-3">
              {hasMyRecord ? (
                // 내가 기록한 책은 이미 추천한 것 — self-like 대신 비활성 표시(책 페이지와 동일)
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-surface-muted px-2.5 py-1.5 text-xs text-text/40">
                  <ThumbIcon filled size={14} />
                  내가 추천한 책
                </span>
              ) : (
                <RecommendButton
                  bookId={bookId}
                  initialLiked={likedByMe}
                  initialCount={recommendCount}
                  initialGroups={myGroups}
                  isLoggedIn={Boolean(user)}
                  variant="detail"
                />
              )}
              <BookmarkButton
                bookId={bookId}
                initialBookmarked={bookmarkedByMe}
                initialCount={book?.bookmark_count ?? 0}
                isLoggedIn={Boolean(user)}
                variant="detail"
              />
            </div>
          )}
        </section>

        {/* ② 작성자 추천 카드 영역 — 차단한 사용자의 기록이면 안내만 */}
        {isBlocked ? (
          <section className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-sm">
            <p className="text-sm text-text/60">차단한 사용자의 기록이에요.</p>
            <UnblockButton userId={post.user_id} />
          </section>
        ) : (
        <section className="mt-4 space-y-4 rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-main/10 text-sm">
              🌿
            </span>
            <span className="text-sm font-medium text-text">
              {post.author?.nickname ?? '익명'}
            </span>
            <span className="ml-auto text-xs text-text/40">
              {formatDate(post.created_at)}
            </span>
          </div>

          {/* 추천 그룹 */}
          {groups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {groups.map((g) => (
                <span
                  key={g}
                  aria-label={g}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xl ${
                    LABEL_TO_BADGE[g] ?? 'bg-surface-muted'
                  }`}
                >
                  {LABEL_TO_EMOJI[g] ?? g}
                </span>
              ))}
            </div>
          )}

          {/* 주제 태그 */}
          {topics.length > 0 && (
            <p className="text-xs text-text/50">
              {topics.map((t) => `#${t}`).join(' ')}
            </p>
          )}

          {/* 글밥량 + 우리 아이 반응 (글밥량은 정보 없으면 숨김 — 임포트 도서 등) */}
          <div className="flex items-center gap-4 text-sm">
            {post.text_density != null && (
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-text/50">글밥량</span>
                <TextDensityMeter value={post.text_density} />
              </span>
            )}
            {REACTION_BY_VALUE[post.child_reaction] && (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text/70">
                {REACTION_BY_VALUE[post.child_reaction].emoji}{' '}
                {REACTION_BY_VALUE[post.child_reaction].label}
              </span>
            )}
          </div>

          {/* 추천 이유 */}
          {post.content && (
            <p className="whitespace-pre-wrap rounded-xl bg-surface-muted p-3 text-sm leading-relaxed text-text/80">
              {post.content}
            </p>
          )}

          {/* 사진 */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img.image_url}
                  alt={`사진 ${i + 1}`}
                  className="h-24 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          {/* 작성자 본인 — 이 기록 수정 (내용 바로 옆이라 직관적). 삭제/공유는 상단 ⋯ 메뉴. */}
          {isOwner && (
            <div className="flex justify-end pt-1">
              <Link
                href={`/recommend/create?edit=${post.id}`}
                className="rounded-full bg-surface-muted px-4 py-1.5 text-xs font-medium text-text/70"
              >
                ✏️ 기록 수정
              </Link>
            </div>
          )}
        </section>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
