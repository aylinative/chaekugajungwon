// 주제 태그 대표 카테고리 (CLAUDE.md 8.1 MECE 재정리 — '시선의 방향' 순서).
// operator_tags.tag_category는 자유 텍스트지만, 신규 태그는 이 6개 중에서만 고르게 한다.
export const TAG_CATEGORIES = [
  '나·마음·몸·습관',
  '가족',
  '친구·사회',
  '자연·생물',
  '사물·개념',
  '놀이·말',
] as const

export type TagCategory = (typeof TAG_CATEGORIES)[number]

export function isTagCategory(v: unknown): v is TagCategory {
  return typeof v === 'string' && (TAG_CATEGORIES as readonly string[]).includes(v)
}
