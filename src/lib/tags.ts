import { TAG_CATEGORIES } from '@/lib/tagCategories'

// 주제 태그 큰 분류 표시 순서 — 단일 소스는 lib/tagCategories.ts (2026.10 개편, 10개)
export const TOPIC_CATEGORY_ORDER = TAG_CATEGORIES

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
