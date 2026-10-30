// 주제 태그 표시·필터 규칙 (서버·클라이언트 공용 — 서버 전용 API import 금지)
// docs/taxonomy/work_order_part3.md Step 1 '필터 규칙' + Step 3 '표시', DECISIONS 9장

// 필터·표시에 쓰는 태그 1개 (숨김 태그 포함)
export interface FilterTag {
  id: string
  slug: string
  name: string
  level: 'topic' | 'detail'
  parent: string | null // 세부일 때 상위 주제 slug
  category: string // 큰 분류
  sortOrder: number
  isActive: boolean
}

export interface TopicFilterValue {
  cat?: string // 큰 분류
  tag?: string // 주제 또는 세부 slug
}

// 보여줄 태그 이름: 세부가 있으면 세부 이름만(같은 기록·책에 그 주제가 함께 있으면 주제는 생략).
// 숨김 태그(개편 전)도 그대로 보여줌. 입력 순서 유지.
export function displayNames(slugs: string[], bySlug: Map<string, FilterTag>): string[] {
  const parentsWithDetail = new Set(
    slugs.map((s) => bySlug.get(s)).filter((t) => t?.level === 'detail' && t.parent).map((t) => t!.parent!)
  )
  const out: string[] = []
  for (const s of slugs) {
    const t = bySlug.get(s)
    if (!t) continue
    if (t.level === 'topic' && parentsWithDetail.has(t.slug)) continue
    if (!out.includes(t.name)) out.push(t.name)
  }
  return out
}

// 필터에 걸리는 태그 slug 집합
// - 세부: 그 세부만
// - 주제: 그 주제 + 그 주제의 세부 (개편 전 '과일'처럼 세부만 달린 기록도 '음식'에서 보이게)
// - 큰 분류: 그 큰 분류에 연결된 모든 태그 (숨김 포함 — 개편 전 '동물'이 '동물' 큰 분류에서 계속 보이게)
export function matchingSlugs(filter: TopicFilterValue, tags: FilterTag[]): Set<string> | null {
  if (filter.tag) {
    // 옛 링크(?tag=태그이름)도 받음
    const t = tags.find((x) => x.slug === filter.tag) ?? tags.find((x) => x.name === filter.tag)
    if (!t) return new Set()
    if (t.level === 'detail' || !t.isActive) return new Set([t.slug])
    return new Set([t.slug, ...tags.filter((x) => x.parent === t.slug).map((x) => x.slug)])
  }
  if (filter.cat) return new Set(tags.filter((x) => x.category === filter.cat).map((x) => x.slug))
  return null // 필터 없음
}

export function passesFilter(cardSlugs: string[], match: Set<string> | null): boolean {
  return !match || cardSlugs.some((s) => match.has(s))
}
