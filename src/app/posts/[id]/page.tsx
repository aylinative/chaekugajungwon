import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import { RECOMMEND_GROUPS, LABEL_TO_EMOJI, sortGroupLabelsByAge, AGE_LABEL_FULL } from '@/lib/groups'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import BookmarkButton from '@/components/BookmarkButton'
import RecommendButton from '@/components/RecommendButton'
import ShareButton from '@/components/ShareButton'
import TextDensityMeter from '@/components/TextDensityMeter'
import BottomTabBar from '@/components/BottomTabBar'
import PostReactions, { type CommentItem } from '@/components/post/PostReactions'
import HidePostButton from '@/components/post/HidePostButton'

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)

interface RawDetail {
  id: string
  text_density: number
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
    aladin_url: string | null
    is_out_of_print: boolean | null
    bookmark_count: number
  } | null
  author: { nickname: string | null } | null
  post_groups: { group_name: string }[] | null
  post_tags:
    | { custom_tag: string | null; is_operator_tag: boolean; operator_tags: { name: string } | null }[]
    | null
  post_images: { image_url: string; sort_order: number }[] | null
}

const DETAIL_SELECT = `id, text_density, child_reaction, content, created_at, user_id,
  book:books ( id, title, author, publisher, published_date, cover_image_url, aladin_url, is_out_of_print, bookmark_count ),
  author:users!posts_user_id_fkey ( nickname ),
  post_groups ( group_name ),
  post_tags ( custom_tag, is_operator_tag, operator_tags ( name ) ),
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

  // 추천은 책 단위 (2026.08 전환) — 이 책을 추천한 사람 수
  const { count: likeCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', post.book?.id ?? '')

  let liked = false
  let myGroups: string[] = []
  let myNickname = ''
  let bookmarkedByMe = false
  if (user && post.book?.id) {
    const { data: likeRow } = await supabase
      .from('likes')
      .select('book_id, group_names')
      .eq('book_id', post.book.id)
      .eq('user_id', user.id)
      .maybeSingle()
    liked = Boolean(likeRow)
    myGroups = (likeRow as { group_names: string[] | null } | null)?.group_names ?? []
    const { data: me } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', user.id)
      .maybeSingle()
    myNickname = (me as { nickname: string } | null)?.nickname ?? ''

    if (post.book?.id) {
      const { data: bookmarkRow } = await supabase
        .from('bookmarks')
        .select('book_id')
        .eq('book_id', post.book.id)
        .eq('user_id', user.id)
        .maybeSingle()
      bookmarkedByMe = Boolean(bookmarkRow)
    }
  }

  const { data: commentRows } = await supabase
    .from('comments')
    .select('id, content, created_at, user_id, author:users!comments_user_id_fkey ( nickname )')
    .eq('post_id', id)
    .is('hidden_at', null)
    .order('created_at', { ascending: true })

  const comments: CommentItem[] = (
    (commentRows as unknown as
      | {
          id: string
          content: string
          created_at: string
          user_id: string
          author: { nickname: string | null } | null
        }[]
      | null) ?? []
  ).map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    nickname: c.author?.nickname ?? '익명',
  }))

  const book = post.book
  const groups = sortGroupLabelsByAge((post.post_groups ?? []).map((g) => g.group_name))
  const topics = (post.post_tags ?? [])
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
        {canModeratePost && <HidePostButton postId={post.id} />}
        <ShareButton
          path={`/posts/${id}`}
          title={`${book?.title ?? '그림책'} | 책육아정원`}
          text={`${book?.title ?? '그림책'} — 아이와 함께 읽은 기록`}
        />
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">
        {/* ① 책 정보 영역 */}
        <section className="flex gap-4 rounded-2xl bg-surface p-4 shadow-sm">
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
            {book?.aladin_url && (
              <a
                href={book.aladin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs text-main underline"
              >
                알라딘에서 보기 ›
              </a>
            )}
          </div>
        </section>

        {/* ② 작성자 추천 카드 영역 */}
        <section className="mt-4 space-y-4 rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-main/10 text-sm">
              🌿
            </span>
            <span className="text-sm font-medium text-text">
              {post.author?.nickname ?? '익명'}
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

          {/* 글밥량 + 우리 아이 반응 */}
          <div className="flex items-start gap-4 text-sm">
            <span className="flex items-start gap-1.5">
              <span className="text-xs leading-5 text-text/50">글밥량</span>
              <TextDensityMeter value={post.text_density} />
            </span>
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
        </section>

        {/* ③ 반응 영역 */}
        <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
          {/* 나도 추천해요 + 저장 — 한 줄 정렬 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-4">
            {book?.id && (
              <RecommendButton
                bookId={book.id}
                initialLiked={liked}
                initialCount={likeCount ?? 0}
                initialGroups={myGroups}
                isLoggedIn={Boolean(user)}
                variant="detail"
              />
            )}
            {book?.id && (
              <BookmarkButton
                bookId={book.id}
                initialBookmarked={bookmarkedByMe}
                initialCount={book.bookmark_count ?? 0}
                isLoggedIn={Boolean(user)}
                variant="detail"
              />
            )}
          </div>
          <PostReactions
            postId={post.id}
            initialComments={comments}
            currentUserId={user?.id ?? null}
            currentUserNickname={myNickname}
            isLoggedIn={Boolean(user)}
            isOperator={isOperator}
          />
        </section>
      </main>

      <BottomTabBar />
    </div>
  )
}
