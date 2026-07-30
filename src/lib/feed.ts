import type { SupabaseClient } from '@supabase/supabase-js'
import { RECOMMEND_GROUPS } from '@/lib/groups'
import { isRecommended } from '@/lib/reactions'

// 그룹 섹션당 최대 노출 카드 수 (기본 3개 노출 → 가로 스크롤로 최대 12개)
const MAX_CARDS_PER_GROUP = 12

export interface FeedCard {
  id: string
  title: string
  cover: string | null
  isbn: string | null
  density: number // 글밥량 1~5
  reaction: number // 우리 아이 반응 1~3
  groups: string[] // 한글 라벨
  topics: string[] // 운영자 태그명 + 커스텀 태그
  likeCount: number
}

export interface GroupSectionData {
  value: string
  label: string
  ageRange: string
  cards: FeedCard[]
}

export interface OperatorTag {
  id: string
  name: string
}

export interface FeedData {
  operatorTags: OperatorTag[]
  sections: GroupSectionData[]
}

// Supabase 중첩 select 결과의 느슨한 타입
interface RawPost {
  id: string
  text_density: number
  child_reaction: number
  created_at: string
  book: { title: string | null; cover_image_url: string | null; aladin_item_id: string | null } | null
  post_groups: { group_name: string }[] | null
  post_tags:
    | {
        custom_tag: string | null
        is_operator_tag: boolean
        operator_tags: { name: string } | null
      }[]
    | null
  likes: { count: number }[] | null
}

function mapPost(p: RawPost): FeedCard {
  const topics = (p.post_tags ?? [])
    .map((t) => (t.is_operator_tag ? t.operator_tags?.name : t.custom_tag))
    .filter((t): t is string => Boolean(t))

  return {
    id: p.id,
    title: p.book?.title ?? '(제목 없음)',
    cover: p.book?.cover_image_url ?? null,
    isbn: p.book?.aladin_item_id ?? null,
    density: p.text_density,
    reaction: p.child_reaction,
    groups: (p.post_groups ?? []).map((g) => g.group_name),
    topics,
    likeCount: p.likes?.[0]?.count ?? 0,
  }
}

// 홈 피드 데이터: 운영자 태그 + 그룹별 인기순 카드.
// tagFilter가 있으면 해당 주제 태그가 붙은 게시물만.
export async function getFeedData(
  supabase: SupabaseClient,
  tagFilter?: string
): Promise<FeedData> {
  const [{ data: tagRows }, { data: postRows }] = await Promise.all([
    supabase
      .from('operator_tags')
      .select('id, name')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('posts')
      .select(
        `id, text_density, child_reaction, created_at,
         book:books ( title, cover_image_url, aladin_item_id ),
         post_groups ( group_name ),
         post_tags ( custom_tag, is_operator_tag, operator_tags ( name ) ),
         likes ( count )`
      )
      .order('created_at', { ascending: false }),
  ])

  const operatorTags: OperatorTag[] = (tagRows as OperatorTag[] | null) ?? []

  const allCards = ((postRows as unknown as RawPost[] | null) ?? [])
    .map(mapPost)
    // 홈 피드 = 커뮤니티 추천. '자꾸 꺼내봐요'·'재밌어했어요'만 노출('그냥 봤어요'는 개인 기록으로만 남음)
    .filter((c) => isRecommended(c.reaction))

  const filtered = tagFilter
    ? allCards.filter((c) => c.topics.includes(tagFilter))
    : allCards

  const sections: GroupSectionData[] = RECOMMEND_GROUPS.map((g) => {
    const cards = filtered
      .filter((c) => c.groups.includes(g.label))
      // 좋아요 우선, 동점이면 반응이 좋은 순
      .sort((a, b) => b.likeCount - a.likeCount || b.reaction - a.reaction)
      .slice(0, MAX_CARDS_PER_GROUP)
    return { value: g.value, label: g.label, ageRange: g.ageRange, cards }
  })

  return { operatorTags, sections }
}
