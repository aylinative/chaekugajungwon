import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { RECOMMEND_GROUPS, LABEL_TO_EMOJI } from '@/lib/groups'
import { getZodiacEmoji } from '@/lib/age'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import AgeLabel from '@/components/AgeLabel'
import BookmarkButton from '@/components/BookmarkButton'
import BottomTabBar from '@/components/BottomTabBar'
import PostReactions, { type CommentItem } from '@/components/post/PostReactions'

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
  post_children: { children: { birth_date: string; label: string | null } | null }[] | null
}

const DETAIL_SELECT = `id, text_density, child_reaction, content, created_at, user_id,
  book:books ( id, title, author, publisher, published_date, cover_image_url, aladin_url, is_out_of_print, bookmark_count ),
  author:users!posts_user_id_fkey ( nickname ),
  post_groups ( group_name ),
  post_tags ( custom_tag, is_operator_tag, operator_tags ( name ) ),
  post_images ( image_url, sort_order ),
  post_children ( children ( birth_date, label ) )`

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('posts')
    .select('book:books(title), post_groups(group_name)')
    .eq('id', id)
    .maybeSingle()

  const raw = data as unknown as {
    book: { title: string | null } | null
    post_groups: { group_name: string }[] | null
  } | null

  const title = raw?.book?.title
  if (!title) return { title: '게시물 | 책육아정원' }
  const group = raw?.post_groups?.[0]?.group_name
  return {
    title: `${title}${group ? ` - ${group}` : ''} 그림책 추천 | 책육아정원`,
    description: `${title} 그림책을 아이와 함께 읽은 기록과 추천.`,
  }
}

function DensityStars({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, value))
  return (
    <span className="text-point">
      {'★'.repeat(filled)}
      <span className="text-text/20">{'☆'.repeat(5 - filled)}</span>
    </span>
  )
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
    .maybeSingle()

  if (!postData) notFound()
  const post = postData as unknown as RawDetail

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { count: likeCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id)

  let liked = false
  let myNickname = ''
  let bookmarkedByMe = false
  if (user) {
    const { data: likeRow } = await supabase
      .from('likes')
      .select('post_id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    liked = Boolean(likeRow)
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
  const groups = (post.post_groups ?? []).map((g) => g.group_name)
  const topics = (post.post_tags ?? [])
    .map((t) => (t.is_operator_tag ? t.operator_tags?.name : t.custom_tag))
    .filter((t): t is string => Boolean(t))
  const images = (post.post_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
  const children = (post.post_children ?? [])
    .map((pc) => pc.children)
    .filter((c): c is { birth_date: string; label: string | null } => Boolean(c))

  const pubInfo = [book?.publisher, book?.published_date].filter(Boolean).join(' · ')

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span className="text-base font-semibold text-text">책육아 기록</span>
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
            {children.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {children.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text/70"
                  >
                    {getZodiacEmoji(new Date(c.birth_date).getFullYear())}{' '}
                    <AgeLabel birthDate={c.birth_date} />
                  </span>
                ))}
              </div>
            )}
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
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-text/50">글밥량</span>
              <DensityStars value={post.text_density} />
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
          {book?.id && (
            <div className="mb-4 border-b border-black/5 pb-4">
              <BookmarkButton
                bookId={book.id}
                initialBookmarked={bookmarkedByMe}
                initialCount={book.bookmark_count ?? 0}
                isLoggedIn={Boolean(user)}
                variant="detail"
              />
              <p className="mt-1.5 text-[11px] text-text/40">
                나중에 아이와 읽고 싶은 책을 저장해 두세요.
              </p>
            </div>
          )}
          <PostReactions
            postId={post.id}
            initialLiked={liked}
            initialCount={likeCount ?? 0}
            initialComments={comments}
            currentUserId={user?.id ?? null}
            currentUserNickname={myNickname}
            isLoggedIn={Boolean(user)}
          />
        </section>
      </main>

      <BottomTabBar />
    </div>
  )
}
