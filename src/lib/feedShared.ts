// 홈 피드·그룹 더보기에서 서버와 클라이언트가 함께 쓰는 타입·정렬 유틸.
// ⚠️ 서버 전용 API(next/cache, DB 클라이언트 등)를 여기에 import하지 말 것 —
//    클라이언트 컴포넌트(FeedSections·GroupBrowser 등)가 이 파일을 가져간다. 서버 로직은 lib/feed.ts.

export interface BookCard {
  bookId: string
  isbn: string // books.book_key — /book/[isbn] slug
  title: string
  cover: string | null
  recordCount: number // 이 책의 기록 수(반응 무관 전체)
  recommendUserCount: number // 추천한 사람 수 (책 단위 distinct user)
  reaction: number // 대표 반응 = 노출 자격(≥2) 기록들의 최빈값
  density: number // 글밥량 대표값 = 최빈값
  groups: string[] // 노출 자격 기록들의 시기 합집합 (여러 섹션 등장 가능, 섹션당 1번)
  topics: string[]
  latestCreatedAt: string
  publishedDate: string | null // books.published_date — '신간순' 정렬용
  bookmarkCount: number // books.bookmark_count (트리거 동기화 값)
  bookmarkedByMe: boolean
  isBoardBook: boolean // 보드북 여부(씨앗·새싹 배지용)
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
  tag_category: string | null
  sort_order: number
}

export interface FeedData {
  operatorTags: OperatorTag[]
  sections: GroupSectionData[]
}

export interface GroupCardsData {
  value: string
  label: string
  ageLabel: string
  cards: BookCard[]
}

// 카드 정렬 방식 (홈 섹션·그룹 더보기 공용 드롭다운).
export type CardSort = 'recommend' | 'published' | 'title'

export const CARD_SORT_LABELS: Record<CardSort, string> = {
  recommend: '추천순',
  published: '신간순',
  title: '제목순',
}

// 'recommend'는 서버 랭킹(sortByGroupRanking) 순서를 그대로 유지한다(재정렬 안 함).
// 'published'=출간일 최신 먼저(없는 값 맨 뒤), 'title'=제목 오름차순(한글 로케일).
export function sortCardsBy(cards: BookCard[], sort: CardSort): BookCard[] {
  if (sort === 'recommend') return cards
  const copy = [...cards]
  if (sort === 'published') {
    copy.sort((a, b) => {
      if (!a.publishedDate && !b.publishedDate) return 0
      if (!a.publishedDate) return 1
      if (!b.publishedDate) return -1
      return b.publishedDate.localeCompare(a.publishedDate)
    })
  } else {
    copy.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }
  return copy
}
