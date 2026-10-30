// 기록하기 '주제 태그' — 서버·클라이언트 공용 타입과 고르기/지우기 규칙.
// 원칙·이유는 docs/taxonomy/DECISIONS.md 8장. (서버 전용 API를 import하지 말 것)

export type TopicLevel = 'topic' | 'detail'

// 기록하기 화면에서 쓰는 태그 1개 (주제 또는 세부)
export interface TaxTag {
  id: string | null // 미리보기(개발용)에서는 null
  slug: string
  level: TopicLevel
  category: string // 큰 분류 이름
  name: string
  parent: string | null // 세부일 때 상위 주제 slug
  chip: string // 칩 아래 회색 예시 문구
  intro: string[] // 책 소개 매칭어
  excl: string[] // 소개 제외어
  order: number
}

export interface TaxonomyData {
  tags: TaxTag[]
  preview: boolean // 개발용 미리보기(DB 개편 전) — 저장 불가
}

// 어디서 골랐는지 (post_tags.source). 운영자만 보는 값.
export type TopicSource = 'recommend' | 'others' | 'all'

export interface TopicPick {
  slug: string
  source: TopicSource | 'existing' // existing = 수정 화면에서 불러온 기존 연결(서버가 그대로 둠)
}

export function indexTags(tags: TaxTag[]) {
  const bySlug = new Map(tags.map((t) => [t.slug, t]))
  const details = new Map<string, TaxTag[]>()
  for (const t of tags) {
    if (t.level !== 'detail' || !t.parent) continue
    if (!details.has(t.parent)) details.set(t.parent, [])
    details.get(t.parent)!.push(t)
  }
  for (const list of details.values()) list.sort((a, b) => a.order - b.order)
  return { bySlug, details }
}
export type TagIndex = ReturnType<typeof indexTags>

const has = (picks: TopicPick[], slug: string) => picks.some((p) => p.slug === slug)
const without = (picks: TopicPick[], slugs: string[]) => picks.filter((p) => !slugs.includes(p.slug))
// 이미 고른 건 위치·출처 유지, 새로 고르면 이번 경로를 출처로
const add = (picks: TopicPick[], slug: string, source: TopicSource) =>
  has(picks, slug) ? picks.map((p) => (p.slug === slug ? { ...p, source } : p)) : [...picks, { slug, source }]

// 주제 칩: 고르기/해제. 해제하면 그 주제의 세부도 함께 지움.
export function toggleTopic(picks: TopicPick[], idx: TagIndex, slug: string, source: TopicSource): TopicPick[] {
  if (has(picks, slug)) return without(picks, [slug, ...(idx.details.get(slug) ?? []).map((d) => d.slug)])
  return add(picks, slug, source)
}

// 세부 칩(추천 줄·다른 양육자 줄의 두 줄 칩): 주제+세부를 한 번에 고르기/해제
export function toggleDetailPair(picks: TopicPick[], idx: TagIndex, detailSlug: string, source: TopicSource): TopicPick[] {
  if (has(picks, detailSlug)) return removeDetail(picks, idx, detailSlug)
  const parent = idx.bySlug.get(detailSlug)?.parent
  if (!parent) return picks
  return add(add(picks, parent, source), detailSlug, source)
}

// 세부 박스 안의 세부: 세부만 고르기/해제 (주제는 그대로 — "주제는 맞는데 세부만 바꾸는" 경우)
export function toggleDetailInBox(picks: TopicPick[], idx: TagIndex, detailSlug: string, source: TopicSource): TopicPick[] {
  if (has(picks, detailSlug)) return without(picks, [detailSlug])
  const parent = idx.bySlug.get(detailSlug)?.parent
  return parent ? add(add(picks, parent, source), detailSlug, source) : picks
}

// 요약 칩의 × (세부 칩): 그 세부를 지우고, 같은 주제의 마지막 세부였으면 주제도 지움
export function removeDetail(picks: TopicPick[], idx: TagIndex, detailSlug: string): TopicPick[] {
  const parent = idx.bySlug.get(detailSlug)?.parent
  let next = without(picks, [detailSlug])
  if (parent && !(idx.details.get(parent) ?? []).some((d) => has(next, d.slug))) next = without(next, [parent])
  return next
}

// 고른 주제 요약 칩: 세부를 고른 주제는 세부마다 칩 1개(두 줄), 아니면 주제 칩 1개
export interface SummaryChip {
  key: string
  topic: TaxTag
  detail: TaxTag | null
}
export function summaryChips(picks: TopicPick[], idx: TagIndex): SummaryChip[] {
  const chips: SummaryChip[] = []
  for (const p of picks) {
    const tag = idx.bySlug.get(p.slug)
    if (!tag || tag.level !== 'topic') continue
    const picked = (idx.details.get(tag.slug) ?? []).filter((d) => has(picks, d.slug))
    if (picked.length === 0) chips.push({ key: tag.slug, topic: tag, detail: null })
    else for (const d of picked) chips.push({ key: d.slug, topic: tag, detail: d })
  }
  return chips
}

// 문자열 정규화 (공백 제거·소문자) — 매칭·제안 집계 공용
export const normalizeText = (s: string) => s.replace(/\s+/g, '').toLowerCase()

// 추천 칩 하나가 여러 세부를 함께 고를 때 (예: 사계절 → 봄·여름·가을·겨울)
// 모두 골라져 있으면 그 세부들을 빼고(마지막 세부면 주제도), 아니면 주제+세부 전부 고름
export function toggleGroup(
  picks: TopicPick[],
  idx: TagIndex,
  topic: string,
  details: string[],
  source: TopicSource
): TopicPick[] {
  if (details.length === 0) return toggleTopic(picks, idx, topic, source)
  if (details.every((d) => has(picks, d))) {
    let next = picks
    for (const d of details) next = removeDetail(next, idx, d)
    return next
  }
  let next = add(picks, topic, source)
  for (const d of details) next = add(next, d, source)
  return next
}
