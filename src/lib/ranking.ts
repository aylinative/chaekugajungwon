// 홈 피드 시기 섹션별 정렬 전환 (CLAUDE.md 6.2)
// - 해당 시기의 누적 기록 수 < 임계값 → (최근 3일 기록 먼저) + 나머지는 매일 랜덤
//   (초기에는 추천 수가 대부분 0이라 0끼리 최신순으로 고정하면 며칠씩 같은 순서 = '멈춘 서비스'처럼 보임.
//    새 기록은 계속 위에 노출해 작성자 이탈을 막되, 오래된 다수는 매일 순서를 섞어 생동감을 준다.)
// - 임계값 이상 → 추천 수 → 대표 반응 → 매일 랜덤(동점 tie-break)
// 6개 섹션이 서로 다른 정렬 상태일 수 있다. 통일하려 하지 말 것.
export const RANKING_SWITCH_THRESHOLD = 5

// 새 기록으로 간주해 상단 노출을 보장하는 기간(최신순 유지) — 이후엔 매일 랜덤 풀로 편입.
const RECENT_MS = 3 * 24 * 60 * 60 * 1000

interface Rankable {
  bookId: string
  recommendUserCount: number
  reaction: number
  latestCreatedAt: string
}

// 날짜(KST) 시드 — 하루 안에선 같은 순서(요청마다 안 흔들림), 자정(KST)마다 갱신.
function kstDateSeed(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// FNV-1a 해시 — 시드+bookId로 책마다 하루 고정 의사난수. 동점 tie-break에 사용.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function sortByGroupRanking<T extends Rankable>(
  cards: T[],
  groupRecordCount: number
): T[] {
  const seed = kstDateSeed()
  const dailyShuffle = (a: T, b: T) => hash(seed + a.bookId) - hash(seed + b.bookId)
  const now = Date.now()
  const isRecent = (c: T) => now - Date.parse(c.latestCreatedAt) < RECENT_MS

  if (groupRecordCount < RANKING_SWITCH_THRESHOLD) {
    return [...cards].sort((a, b) => {
      const ra = isRecent(a)
      const rb = isRecent(b)
      if (ra !== rb) return ra ? -1 : 1 // 최근 3일 기록 먼저(새 기록 노출 보장)
      if (ra && rb) return b.latestCreatedAt.localeCompare(a.latestCreatedAt) // 최근끼리는 최신순
      return dailyShuffle(a, b) // 오래된 다수는 매일 랜덤
    })
  }
  return [...cards].sort(
    (a, b) =>
      b.recommendUserCount - a.recommendUserCount ||
      b.reaction - a.reaction ||
      dailyShuffle(a, b)
  )
}
