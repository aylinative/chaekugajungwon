import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { RECOMMEND_GROUPS, sortGroupLabelsByAge } from '@/lib/groups'
import { sortByGroupRanking } from '@/lib/ranking'
import { FEED_CACHE_TAG } from '@/lib/cacheTags'
import type { BookCard, GroupSectionData, OperatorTag, FeedData, GroupCardsData } from '@/lib/feedShared'

// 홈 피드 = 책 1권 = 카드 1개 (기록 단위 아님 — CLAUDE.md 6.2/17장 책 단위 통합)
// 같은 책에 기록이 여러 개면 집계값(추천 N명·대표 반응·글밥 대표값)으로 묶는다.
//
// 성능 구조(2026.10, #2):
//   · 책별 집계는 DB 뷰 book_feed_cards가 수행(supabase/add_feed_views.sql) — 앱은 책 1권당 1행만 받는다.
//   · '마지막으로 받은 id 다음부터 1,000건'(keyset)으로 끝까지 나눠 조회 — Supabase API 행 제한으로 인한
//     누락이 없고, 조회 중 데이터가 바뀌어도 중복·누락이 없다. 뷰가 책 단위로 계산하므로 요청당 작업량 일정.
//   · 공개 집계는 unstable_cache로 캐시(태그 'feed'), 쓰기 시 revalidateFeed()로 즉시 만료.
//   · 사람마다 다른 '내가 저장함'과 날짜 시드 정렬은 캐시 밖에서 매 요청 처리.

// 시기 섹션당 최대 노출 카드 수 (기본 3개 노출 → 가로 스크롤로 최대 12개)
const MAX_CARDS_PER_GROUP = 12

// 한 번에 요청하는 행 수. 서버 행 제한이 이보다 작아도 '마지막 id 다음부터' 이어 받으므로 누락 없음.
const PAGE_SIZE = 1000

// 무한 반복 방지 안전장치(1,000 × 10,000 = 1천만 행). 넘으면 오류로 처리(빈 결과는 캐시되지 않음).
const MAX_PAGES = 10_000

// book_feed_cards에서 가져오는 컬럼(뷰에 컬럼이 늘어도 페이로드가 불지 않게 명시)
const FEED_CARD_COLUMNS =
  'book_id, book_key, title, cover_image_url, published_date, bookmark_count, is_board_book, ' +
  'record_count, recommend_count, reaction, density, latest_created_at, group_post_counts, ' +
  'op_topics, op_categories, custom_topics'

// 카드 형태가 바뀌면 올린다 — 배포 후에도 남는 옛 캐시(다른 형태)를 쓰지 않게.
const PUBLIC_FEED_CACHE_KEY = ['public-feed', 'v2']

export type { BookCard, GroupSectionData, OperatorTag, FeedData, GroupCardsData, CardSort } from '@/lib/feedShared'
export { CARD_SORT_LABELS, sortCardsBy } from '@/lib/feedShared'

// book_feed_cards 뷰의 한 행
interface FeedCardRow {
  book_id: string
  book_key: string | null
  title: string | null
  cover_image_url: string | null
  published_date: string | null
  bookmark_count: number
  is_board_book: boolean
  record_count: number
  recommend_count: number
  reaction: number | null
  density: number
  latest_created_at: string
  group_post_counts: Record<string, number> // 시기별 자격 기록 수 — 키 = 이 책의 시기 합집합
  op_topics: string[]
  op_categories: string[]
  custom_topics: string[]
}

// 캐시에 저장되는 공개 데이터 (사람마다 다른 값은 넣지 않는다)
interface PublicFeed {
  operatorTags: OperatorTag[]
  cards: BookCard[] // bookmarkedByMe는 항상 false — 요청마다 덧씌운다
  groupRecordCounts: Record<string, number> // 직렬화 가능한 객체(Map 불가)
}

// keyset 페이지네이션: 정렬 키(유일값) 기준으로 '마지막으로 받은 값 다음부터' 끝까지 반복.
// 빈 페이지가 오면 종료. 오류는 던진다(빈 결과가 캐시되지 않게).
async function fetchAllByKey<T>(
  key: keyof T & string,
  fetchPage: (after: string | null) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const all: T[] = []
  let after: string | null = null
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await fetchPage(after)
    if (error) throw error
    const rows = data ?? []
    if (rows.length === 0) return all
    all.push(...rows)
    after = String(rows[rows.length - 1][key])
  }
  throw new Error('fetchAllByKey(' + key + '): page limit exceeded')
}

// 캐시 함수 안에서는 쿠키를 쓸 수 없으므로 쿠키 없는 공개(anon) 클라이언트를 쓴다.
// 공개 읽기 데이터만 조회(뷰는 security_invoker라 anon의 RLS가 그대로 적용됨).
function createAnonClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// 책 카드용 주제 = 운영자 하위 태그 + 커스텀 태그. 단, 커스텀 태그가 운영자 태그의 '카테고리명'이나
// 운영자 태그명과 겹치면 드롭(예: 커스텀 '가족' + 운영자 '엄마'(카테고리 가족) → '가족' 제거).
function topicsFor(row: FeedCardRow): string[] {
  const opNames = new Set(row.op_topics)
  const categories = new Set(row.op_categories)
  const result = [...row.op_topics]
  for (const c of row.custom_topics) if (!categories.has(c) && !opNames.has(c)) result.push(c)
  return result
}

function toCard(row: FeedCardRow): BookCard {
  return {
    bookId: row.book_id,
    isbn: row.book_key ?? '',
    title: row.title ?? '(제목 없음)',
    cover: row.cover_image_url,
    recordCount: row.record_count,
    recommendUserCount: row.recommend_count,
    reaction: row.reaction ?? 2,
    density: row.density,
    groups: sortGroupLabelsByAge(Object.keys(row.group_post_counts)), // 시기는 순서형 — 항상 연령 오름차순
    topics: topicsFor(row),
    latestCreatedAt: row.latest_created_at,
    publishedDate: row.published_date,
    bookmarkCount: row.bookmark_count,
    bookmarkedByMe: false,
    isBoardBook: row.is_board_book,
  }
}

async function fetchOperatorTagsOrThrow(supabase: SupabaseClient): Promise<OperatorTag[]> {
  const { data, error } = await supabase
    .from('operator_tags')
    .select('id, name, tag_category, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as OperatorTag[] | null) ?? []
}

// 활성 운영자 태그 (그룹 더보기 주제 탭 등). 실패 시 빈 배열.
export async function fetchOperatorTags(supabase: SupabaseClient): Promise<OperatorTag[]> {
  try {
    return await fetchOperatorTagsOrThrow(supabase)
  } catch (error) {
    console.error('fetchOperatorTags error:', error)
    return []
  }
}

// 공개 피드 집계(캐시). 정렬은 하지 않는다 — 날짜 시드 정렬을 매 요청 적용하기 위해.
const getPublicFeed = unstable_cache(
  async (): Promise<PublicFeed> => {
    const supabase = createAnonClient()
    const [operatorTags, rows] = await Promise.all([
      fetchOperatorTagsOrThrow(supabase),
      fetchAllByKey<FeedCardRow>('book_id', (after) => {
        let q = supabase
          .from('book_feed_cards')
          .select(FEED_CARD_COLUMNS)
          .order('book_id')
          .limit(PAGE_SIZE)
        if (after) q = q.gt('book_id', after)
        return q.returns<FeedCardRow[]>()
      }),
    ])

    // 시기별 누적 기록 수(정렬 전환 임계값 판정용) = 책별 시기 기록 수의 합
    const groupRecordCounts: Record<string, number> = {}
    for (const r of rows) {
      for (const [g, c] of Object.entries(r.group_post_counts)) {
        groupRecordCounts[g] = (groupRecordCounts[g] ?? 0) + c
      }
    }
    return { operatorTags, cards: rows.map(toCard), groupRecordCounts }
  },
  PUBLIC_FEED_CACHE_KEY,
  { tags: [FEED_CACHE_TAG], revalidate: 60 } // 쓰기 시 즉시 만료, 60초는 누락 대비 안전망
)

// 조회 실패 시 null — 빈 결과를 캐시하지 않고(캐시 함수가 던짐) 이번 요청만 빈 화면으로 처리.
async function loadPublicFeed(): Promise<PublicFeed | null> {
  try {
    return await getPublicFeed()
  } catch (error) {
    console.error('getPublicFeed error:', error)
    return null
  }
}

// 로그인 사용자가 저장한 책 id (사람마다 다르므로 캐시하지 않음). 실패 시 빈 집합.
async function fetchMyBookmarkIds(
  supabase: SupabaseClient,
  userId?: string
): Promise<Set<string>> {
  if (!userId) return new Set()
  try {
    const rows = await fetchAllByKey<{ book_id: string }>('book_id', (after) => {
      let q = supabase
        .from('bookmarks')
        .select('book_id')
        .eq('user_id', userId)
        .order('book_id')
        .limit(PAGE_SIZE)
      if (after) q = q.gt('book_id', after)
      return q.returns<{ book_id: string }[]>()
    })
    return new Set(rows.map((r) => r.book_id))
  } catch (error) {
    console.error('bookmarks fetch error:', error)
    return new Set()
  }
}

// 캐시된 카드 객체는 직접 수정하지 않고 새 객체로 덧씌운다.
function withBookmarks(cards: BookCard[], mine: Set<string>): BookCard[] {
  if (mine.size === 0) return cards
  return cards.map((c) => (mine.has(c.bookId) ? { ...c, bookmarkedByMe: true } : c))
}

export async function getFeedData(
  supabase: SupabaseClient,
  tagFilter?: string,
  userId?: string
): Promise<FeedData> {
  const [feed, mine] = await Promise.all([loadPublicFeed(), fetchMyBookmarkIds(supabase, userId)])

  const cards = feed?.cards ?? []
  const filtered = tagFilter ? cards.filter((c) => c.topics.includes(tagFilter)) : cards

  const sections: GroupSectionData[] = RECOMMEND_GROUPS.map((g) => {
    const inGroup = filtered.filter((c) => c.groups.includes(g.label))
    const top = sortByGroupRanking(inGroup, feed?.groupRecordCounts[g.label] ?? 0).slice(
      0,
      MAX_CARDS_PER_GROUP
    )
    return {
      value: g.value,
      label: g.label,
      ageRange: g.ageRange,
      cards: withBookmarks(top, mine), // 노출되는 카드에만 덧씌움
    }
  })

  return { operatorTags: feed?.operatorTags ?? [], sections }
}

// 그룹 전체보기: 해당 시기 카드 전체(캡 없음)를 홈과 동일한 랭킹으로 정렬해 반환.
// 잘못된 그룹 value면 null.
export async function getGroupCards(
  supabase: SupabaseClient,
  groupValue: string,
  userId?: string
): Promise<GroupCardsData | null> {
  const group = RECOMMEND_GROUPS.find((g) => g.value === groupValue)
  if (!group) return null

  const [feed, mine] = await Promise.all([loadPublicFeed(), fetchMyBookmarkIds(supabase, userId)])
  const inGroup = (feed?.cards ?? []).filter((c) => c.groups.includes(group.label))
  const sorted = sortByGroupRanking(inGroup, feed?.groupRecordCounts[group.label] ?? 0)

  return {
    value: group.value,
    label: group.label,
    ageLabel: group.ageLabel,
    cards: withBookmarks(sorted, mine),
  }
}

// ---------- 운영자 '서비스 규모' 경고용 (마이페이지) ----------
// 캐시된 공개 피드에서 계산하므로 추가 DB 조회가 없다. 기준을 넘기 전에 구조 전환(CLAUDE.md 성능 단계 2)을 하기 위한 신호.

// Next 데이터 캐시 항목 한도(node_modules/next .../incremental-cache: 2MB 초과 시 운영=저장 생략·경고, 개발=오류).
export const FEED_CACHE_LIMIT = 2 * 1024 * 1024
// 그룹 더보기는 한 시기의 카드를 한 번에 보낸다 — 이 이상이면 모바일에서 무거워져 '더 불러오기' 전환 필요.
export const GROUP_PAGE_BOOK_LIMIT = 1000

export interface FeedScale {
  feedBooks: number // 피드에 노출 자격이 있는 책 수(캐시 카드 수)
  cacheSize: number // Next가 한도를 재는 방식과 같은 기준의 크기
  largestGroup: { label: string; books: number }
}

export async function getFeedScale(): Promise<FeedScale | null> {
  const feed = await loadPublicFeed()
  if (!feed) return null
  // Next는 결과를 JSON 문자열로 담은 캐시 항목 전체를 다시 직렬화해 그 길이로 한도를 잰다 → 이중 직렬화로 맞춘다.
  const cacheSize = JSON.stringify(JSON.stringify(feed)).length
  const largestGroup = RECOMMEND_GROUPS.map((g) => ({
    label: g.label,
    books: feed.cards.filter((c) => c.groups.includes(g.label)).length,
  })).reduce((a, b) => (b.books > a.books ? b : a))
  return { feedBooks: feed.cards.length, cacheSize, largestGroup }
}
