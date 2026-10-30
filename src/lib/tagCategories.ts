// 주제 태그 큰 분류 10개 (docs/taxonomy/DECISIONS.md 5장, 2026.10 개편). 표시 순서 = 이 배열 순서.
// operator_tags.tag_category에 이 이름이 그대로 들어간다. 큰 분류는 고르는 대상이 아니라 묶음.
// DB로 옮기는 건 Deferred TODO '관리자 작업툴' (자주 안 바뀌어 코드 상수로 둠 — Part 0 ⑤).
export const TAG_CATEGORIES = [
  '마음·감정',
  '몸·생활',
  '가족',
  '친구·세상',
  '동물',
  '자연·계절',
  '명절·기념일·전통',
  '탈것·음식·물건',
  '말·인지',
  '놀이·재미·상상',
] as const

export type TagCategory = (typeof TAG_CATEGORIES)[number]

export function isTagCategory(v: unknown): v is TagCategory {
  return typeof v === 'string' && (TAG_CATEGORIES as readonly string[]).includes(v)
}
