import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'
import Bookshelf, { type ShelfItem } from '@/components/mypage/Bookshelf'
import MyShelfView, { type ShelfBook } from '@/components/mypage/MyShelfView'
import ProfileEditor from '@/components/mypage/ProfileEditor'
import ReadingCalendar, { type CalendarRecord } from '@/components/mypage/ReadingCalendar'
import { FEEDBACK_FORM_URL } from '@/lib/feedback'

export const metadata: Metadata = { title: '마이페이지 | 책육아정원' }

interface MyPostRow {
  id: string
  book_id: string
  created_at: string
  book: { book_key: string | null; title: string | null; cover_image_url: string | null } | null
  post_tags:
    | { is_operator_tag: boolean; operator_tags: { name: string; tag_category: string | null } | null }[]
    | null
}

interface MyBookmarkRow {
  book: { book_key: string | null; title: string | null; cover_image_url: string | null } | null
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
      .select(
        `id, book_id, created_at, book:books ( book_key, title, cover_image_url ),
         post_tags ( is_operator_tag, operator_tags ( name, tag_category ) )`
      )
      .eq('user_id', user.id)
      .is('hidden_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookmarks')
      .select(`book:books ( book_key, title, cover_image_url )`)
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

  // 책육아 기록 통계 = 기록 수(재독 포함). created_at은 UTC라 KST(+9) 벽시계로 변환해 월/주 판정.
  const KST_MS = 9 * 60 * 60 * 1000
  const nowKst = new Date(Date.now() + KST_MS)
  const curY = nowKst.getUTCFullYear()
  const curM = nowKst.getUTCMonth()
  // 하단 요약: 총 누적(고정) · 올해(고정). '이번 달'은 보는 달 기준이라 캘린더가 계산.
  // 매일 기록 여부는 캘린더로 시각화되므로 '주'는 제외.
  let statYear = 0
  for (const p of posts) {
    const k = new Date(new Date(p.created_at).getTime() + KST_MS)
    if (k.getUTCFullYear() === curY) statYear++
  }
  const statTotal = posts.length

  // 기록 달력용 — 각 기록을 KST 날짜 문자열로 (재독 포함, created_at desc 순서 유지)
  const todayStr = `${curY}-${String(curM + 1).padStart(2, '0')}-${String(nowKst.getUTCDate()).padStart(2, '0')}`
  const calendarRecords: CalendarRecord[] = posts.map((p) => {
    const k = new Date(new Date(p.created_at).getTime() + KST_MS)
    return {
      id: p.id,
      date: `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`,
      cover: p.book?.cover_image_url ?? null,
      title: p.book?.title ?? '(제목 없음)',
    }
  })

  // 우리집 책장 = 내가 읽은 '책'(재독 중복 제거, 최근순). 표지 클릭 → 책 페이지(거기서 기록 카드 수정/삭제).
  const seen = new Set<string>()
  const shelfBooks: ShelfBook[] = []
  for (const p of posts) {
    if (!p.book || seen.has(p.book_id)) continue
    seen.add(p.book_id)
    const categories = Array.from(
      new Set(
        (p.post_tags ?? [])
          .map((t) => t.operator_tags?.tag_category)
          .filter((c): c is string => Boolean(c))
      )
    )
    shelfBooks.push({
      href: `/book/${encodeURIComponent(p.book.book_key ?? '')}`,
      cover: p.book.cover_image_url,
      title: p.book.title ?? '(제목 없음)',
      categories,
    })
  }

  const wishItems: ShelfItem[] = bookmarks.map((b) => ({
    href: `/book/${encodeURIComponent(b.book!.book_key ?? '')}`,
    cover: b.book!.cover_image_url,
    title: b.book!.title ?? '(제목 없음)',
  }))

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <span className="text-base font-semibold text-text">마이페이지</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 pb-24 pt-4">
        {/* 프로필 (닉네임 + 아이 정보 편집) */}
        <ProfileEditor initialNickname={nickname} initialChildren={children} />

        {/* 책육아 기록 달력 — 날짜별 표지 + 탭 시 그날 기록. 통계(월 수·총·이번주) 통합 */}
        <ReadingCalendar
          records={calendarRecords}
          initialYear={curY}
          initialMonth={curM}
          todayStr={todayStr}
          totalCount={statTotal}
          yearCount={statYear}
        />

        {/* ① 우리집 책장 (내가 읽은 책, 전면책장) */}
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">
            우리집 책장
            {shelfBooks.length > 0 && (
              <span className="ml-1 font-normal text-text/40">· {shelfBooks.length}권</span>
            )}
          </h2>
          {shelfBooks.length === 0 ? (
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
            <MyShelfView books={shelfBooks} />
          )}
        </section>

        {/* 두 책장 영역 사이 여백 확대 — 서로 다른 영역으로 구분되게 */}
        <div aria-hidden className="h-5" />

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

        {/* 문의·건의 + (운영자) 숨긴 기록 관리 + 로그아웃 */}
        <footer className="flex flex-col items-center gap-3 pt-2">
          <div className="flex items-center gap-3 text-xs text-text/40">
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              건의·제보
            </a>
            {isOperator && (
              <>
                <span aria-hidden>·</span>
                <Link href="/moderation" className="underline underline-offset-2">
                  🗂️ 숨긴 기록 관리
                </Link>
              </>
            )}
          </div>
          <a
            href="/api/auth/logout"
            className="rounded-xl border border-black/10 px-5 py-2 text-sm text-text/70"
          >
            로그아웃
          </a>
        </footer>
      </main>

      <BottomTabBar />
    </div>
  )
}
