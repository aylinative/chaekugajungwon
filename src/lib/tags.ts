// 주제 태그 대표 카테고리 표시 순서 (단일 소스) — operator_tags.tag_category 값과 일치.
// 시선의 방향(나→가족→친구·사회→세상) 순. CLAUDE.md 8.1 확정(2026.08.24).
export const TOPIC_CATEGORY_ORDER = [
  '나·마음·몸·습관',
  '가족',
  '친구·사회',
  '자연·생물',
  '사물·개념',
  '놀이·말',
] as const

export interface OperatorTagRow {
  name: string
  tag_category: string | null
  sort_order: number
}

export interface TagCategoryGroup {
  category: string
  tags: string[]
}

// DB에서 읽은 활성 태그를 카테고리 순서·정렬(sort_order)대로 그룹화
export function groupTagsByCategory(tags: OperatorTagRow[]): TagCategoryGroup[] {
  const byCat = new Map<string, OperatorTagRow[]>()
  for (const t of tags) {
    const cat = t.tag_category ?? '기타'
    if (!byCat.has(cat)) byCat.set(cat, [])
    byCat.get(cat)!.push(t)
  }
  const ordered: TagCategoryGroup[] = []
  const push = (cat: string, list: OperatorTagRow[]) => {
    list.sort((a, b) => a.sort_order - b.sort_order)
    ordered.push({ category: cat, tags: list.map((t) => t.name) })
  }
  for (const cat of TOPIC_CATEGORY_ORDER) {
    const list = byCat.get(cat)
    if (list) {
      push(cat, list)
      byCat.delete(cat)
    }
  }
  // 순서 배열에 없는 카테고리가 있으면 뒤에 붙임(안전)
  for (const [cat, list] of byCat) push(cat, list)
  return ordered
}
