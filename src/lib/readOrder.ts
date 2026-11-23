// 같은 책 재독 순번 (2026.11.23) — '2번째' 표시용. DB에 저장하지 않고 그때그때 센다.
// 기준: 한 사람의 같은 책 기록(삭제한 기록 제외) 중 일기 날짜 순, 같은 날이면 쓴 순서. 중간 기록을 지우면 번호가 당겨진다.

export interface OrderablePost {
  id: string
  user_id: string
  diary_date?: string | null
  created_at: string
}

const dayOf = (p: OrderablePost) => p.diary_date ?? p.created_at.slice(0, 10)
const byOldest = (a: OrderablePost, b: OrderablePost) =>
  dayOf(a).localeCompare(dayOf(b)) || a.created_at.localeCompare(b.created_at)

// 한 책의 기록들 → 기록 id별 순번(1부터). 1번째만 있는 사람도 1로 들어간다(화면은 2 이상만 표시).
export function readOrderById(posts: OrderablePost[]): Map<string, number> {
  const byUser = new Map<string, OrderablePost[]>()
  for (const p of posts) byUser.set(p.user_id, [...(byUser.get(p.user_id) ?? []), p])
  const order = new Map<string, number>()
  for (const list of byUser.values()) [...list].sort(byOldest).forEach((p, i) => order.set(p.id, i + 1))
  return order
}

// 한 책의 기록들 → 사람별 묶음. 묶음 안은 최신 회차 먼저, 묶음끼리는 가장 최근 읽은 날 순(최신순).
export function groupByAuthor<T extends OrderablePost>(posts: T[]): T[][] {
  const byUser = new Map<string, T[]>()
  for (const p of posts) byUser.set(p.user_id, [...(byUser.get(p.user_id) ?? []), p])
  const groups = [...byUser.values()].map((list) => [...list].sort((a, b) => byOldest(b, a)))
  return groups.sort((a, b) => byOldest(b[0], a[0]))
}

// 'N번째' 표기 — 1번째는 표시하지 않는다(재독일 때만)
export const readOrderLabel = (n: number | undefined) => (n && n > 1 ? `${n}번째` : null)
