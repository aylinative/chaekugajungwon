import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'
import Bookshelf, { type ShelfItem } from '@/components/mypage/Bookshelf'
import ProfileEditor from '@/components/mypage/ProfileEditor'

export const metadata: Metadata = { title: '마이페이지 | 책육아정원' }

interface MyPostRow {
  id: string
  book_id: string
  book: { aladin_item_id: string | null; title: string | null; cover_image_url: string | null } | null
}

interface MyBookmarkRow {
  book: { aladin_item_id: string | null; title: string | null; cover_image_url: string | null } | null
}

export default async function MyPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [meRes, childRes, postRes, bookmarkRes] = await Promise.all([
    supabase.from('users').select('nickname, is_operator').eq('id', user.id).maybeSingle(),
    supabase
      .from('children')
      .select('birth_date')
      .eq('user_id', user.id)
      .order('birth_date', { ascending: true }),
    supabase
      .from('posts')
      .select(`id, book_id, book:books ( aladin_item_id, title, cover_image_url )`)
      .eq('user_id', user.id)
      .is('hidden_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookmarks')
      .select(`book:books ( aladin_item_id, title, cover_image_url )`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const me = meRes.data as { nickname: string | null; is_operator: boolean } | null
  const nickname = me?.nickname ?? ''
  const isOperator = Boolean(me?.is_operator)
  const children = ((childRes.data as { birth_date: string }[] | null) ?? []).map((c) => ({
    birth_date: c.birth_date,
  }))
  const posts = (postRes.data as unknown as MyPostRow[] | null) ?? []
  const bookmarks = ((bookmarkRes.data as unknown as MyBookmarkRow[] | null) ?? []).filter(
    (b) => b.book
  )

  // 우리집 책장 = 내가 읽은 '책'(재독 중복 제거, 최근순). 표지 클릭 → 책 페이지(거기서 기록 카드 수정/삭제).
  const seen = new Set<string>()
  const shelfItems: ShelfItem[] = []
  for (const p of posts) {
    if (!p.book || seen.has(p.book_id)) continue
    seen.add(p.book_id)
    shelfItems.push({
      href: `/book/${encodeURIComponent(p.book.aladin_item_id ?? '')}`,
      cover: p.book.cover_image_url,
      title: p.book.title ?? '(제목 없음)',
    })
  }

  const wishItems: ShelfItem[] = bookmarks.map((b) => ({
    href: `/book/${encodeURIComponent(b.book!.aladin_item_id ?? '')}`,
    cover: b.book!.cover_image_url,
    title: b.book!.title ?? '(제목 없음)',
  }))

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <span className="text-base font-semibold text-text">마이페이지</span>
        <a href="/api/auth/logout" className="text-xs text-text/40">
          로그아웃
        </a>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 pb-24 pt-4">
        {/* 프로필 (닉네임 + 아이 정보 편집) */}
        <ProfileEditor initialNickname={nickname} initialChildren={children} />

        {/* 운영자 전용 — 숨긴 기록 관리(복구) */}
        {isOperator && (
          <Link
            href="/moderation"
            className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              🗂️ 숨긴 기록 관리
            </span>
            <span className="text-xs text-text/40">운영자 ›</span>
          </Link>
        )}

        {/* ① 우리집 책장 (내가 읽은 책, 전면책장) */}
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">
            우리집 책장
            {shelfItems.length > 0 && (
              <span className="ml-1 font-normal text-text/40">· {shelfItems.length}권</span>
            )}
          </h2>
          {shelfItems.length === 0 ? (
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
            <Bookshelf items={shelfItems} emptyText="아직 기록한 책이 없어요." />
          )}
        </section>

        {/* ② 아이와 읽고 싶은 책 (저장, 전면책장) */}
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-text">
            아이와 읽고 싶은 책
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-main"
              aria-label="저장"
            >
              <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </h2>
          <Bookshelf items={wishItems} emptyText="아직 저장한 책이 없어요." />
        </section>
      </main>

      <BottomTabBar />
    </div>
  )
}
