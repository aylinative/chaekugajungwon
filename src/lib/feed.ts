import type { SupabaseClient } from '@supabase/supabase-js'
import { RECOMMEND_GROUPS } from '@/lib/groups'
import { isRecommended } from '@/lib/reactions'
import { sortByGroupRanking } from '@/lib/ranking'

// 홈 피드 = 책 1권 = 카드 1개 (기록 단위 아님 — CLAUDE.md 6.2/17장 책 단위 통합)
// 같은 책에 기록이 여러 개면 집계값(추천 N명·대표 반응·글밥 대표값)으로 묶는다.

// 시기 섹션당 최대 노출 카드 수 (기본 3개 노출 → 가로 스크롤로 최대 12개)
const MAX_CARDS_PER_GROUP = 12

export interface BookCard {
  bookId: string
  isbn: string // books.aladin_item_id — /book/[isbn] slug
  title: string
  cover: string | null
  recordCount: number // 이 책의 기록 수(반응 무관 전체)
  recommendUserCount: number // 추천한 사람 수 (책 단위 distinct user)
  reaction: number // 대표 반응 = 노출 자격(≥2) 기록들의 최빈값
  density: number // 글밥량 대표값 = 최빈값
  groups: string[] // 노출 자격 기록들의 시기 합집합 (여러 섹션 등장 가능, 섹션당 1번)
  topics: string[]
  latestCreatedAt: string
  bookmarkCount: number // books.bookmark_count (트리거 동기화 값)
  bookmarkedByMe: boolean
}

export interface GroupSectionData {
  value: string
  label: string
  ageRange: string
  cards: BookCard[]
}

export interface OperatorTag {
  id: string
  name: string
}

export interface FeedData {
  operatorTags: OperatorTag[]
  sections: GroupSectionData[]
}

interface RawPost {
  id: string
  text_density: number
  child_reaction: number
  created_at: string
  book: {
    id: string
    title: string | null
    cover_image_url: string | null
    aladin_item_id: string | null
    bookmark_count: number
  } | null
  post_groups: { group_name: string }[] | null
  post_tags:
    | {
        custom_tag: string | null
        is_operator_tag: boolean
        operator_tags: { name: string } | null
      }[]
    | null
  likes: { user_id: string }[] | null
}

// 최빈값 (동률이면 큰 값 — 반응 3>2, 글밥은 무해)
function modeOf(nums: number[]): number {
  const freq = new Map<number, number>()
  nums.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1))
  let best = nums[0] ?? 0
  let bestCount = 0
  for (const [n, c] of freq) {
    if (c > bestCount || (c === bestCount && n > best)) {
      best = n
      bestCount = c
    }
  }
  return best
}

function topicsOf(p: RawPost): string[] {
  return (p.post_tags ?? [])
    .map((t) => (t.is_operator_tag ? t.operator_tags?.name : t.custom_tag))
    .filter((t): t is string => Boolean(t))
}

export async function getFeedData(
  supabase: SupabaseClient,
  tagFilter?: string,
  userId?: string
): Promise<FeedData> {
  const [{ data: tagRows }, { data: postRows }, { data: bookmarkRows }] =
    await Promise.all([
      supabase
        .from('operator_tags')
        .select('id, name')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('posts')
        .select(
          `id, text_density, child_reaction, created_at,
           book:books ( id, title, cover_image_url, aladin_item_id, bookmark_count ),
           post_groups ( group_name ),
           post_tags ( custom_tag, is_operator_tag, operator_tags ( name ) ),
           likes ( user_id )`
        )
        .order('created_at', { ascending: false }),
      userId
        ? supabase.from('bookmarks').select('book_id').eq('user_id', userId)
        : Promise.resolve({ data: null }),
    ])

  const operatorTags: OperatorTag[] = (tagRows as OperatorTag[] | null) ?? []
  const bookmarkedBookIds = new Set(
    ((bookmarkRows as { book_id: string }[] | null) ?? []).map((b) => b.book_id)
  )

  const posts = ((postRows as unknown as RawPost[] | null) ?? []).filter((p) => p.book)

  // 시기별 누적 기록 수 (정렬 전환 임계값 판정용 — 태그 필터와 무관한 시기 전체 기준)
  const groupRecordCounts = new Map<string, number>()
  // 책 단위 묶기
  const byBook = new Map<string, RawPost[]>()
  for (const p of posts) {
    const bookId = p.book!.id
    const list = byBook.get(bookId) ?? []
    list.push(p)
    byBook.set(bookId, list)
    if (isRecommended(p.child_reaction)) {
      for (const g of p.post_groups ?? []) {
        groupRecordCounts.set(g.group_name, (groupRecordCounts.get(g.group_name) ?? 0) + 1)
      }
    }
  }

  const cards: BookCard[] = []
  for (const [bookId, list] of byBook) {
    // 홈 피드 = 커뮤니티 추천: 반응 2 이상 기록이 있는 책만 노출.
    // '그냥 봤어요'(1)만 있는 책은 개인 기록·책 단위 집계에는 남지만 피드엔 안 뜸.
    const qualifying = list.filter((p) => isRecommended(p.child_reaction))
    if (qualifying.length === 0) continue

    // 추천 수는 책 단위 distinct user (반응 1 기록에 달린 추천도 책에 대한 신호이므로 전체 기록 기준)
    const likeUsers = new Set<string>()
    list.forEach((p) => (p.likes ?? []).forEach((l) => likeUsers.add(l.user_id)))

    const book = list[0].book!
    cards.push({
      bookId,
      isbn: book.aladin_item_id ?? '',
      title: book.title ?? '(제목 없음)',
      cover: book.cover_image_url,
      recordCount: list.length,
      recommendUserCount: likeUsers.size,
      reaction: modeOf(qualifying.map((p) => p.child_reaction)),
      density: modeOf(list.map((p) => p.text_density)),
      groups: [
        ...new Set(qualifying.flatMap((p) => (p.post_groups ?? []).map((g) => g.group_name))),
      ],
      topics: [...new Set(qualifying.flatMap(topicsOf))],
      latestCreatedAt: qualifying
        .map((p) => p.created_at)
        .sort()
        .at(-1)!,
      bookmarkCount: book.bookmark_count ?? 0,
      bookmarkedByMe: bookmarkedBookIds.has(bookId),
    })
  }

  const filtered = tagFilter ? cards.filter((c) => c.topics.includes(tagFilter)) : cards

  const sections: GroupSectionData[] = RECOMMEND_GROUPS.map((g) => {
    const inGroup = filtered.filter((c) => c.groups.includes(g.label))
    const sorted = sortByGroupRanking(inGroup, groupRecordCounts.get(g.label) ?? 0).slice(
      0,
      MAX_CARDS_PER_GROUP
    )
    return { value: g.value, label: g.label, ageRange: g.ageRange, cards: sorted }
  })

  return { operatorTags, sections }
}
