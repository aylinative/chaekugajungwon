// 홈 피드 시기 섹션별 정렬 전환 (CLAUDE.md 6.2)
// - 해당 시기의 누적 기록 수 < 임계값 → 최신순
//   (초기에는 추천 수가 대부분 0이라 0끼리 정렬하면 무작위가 되고 새 기록이 묻힌다)
// - 임계값 이상 → 추천 수 → 대표 반응 → 최신순
// 6개 섹션이 서로 다른 정렬 상태일 수 있다. 통일하려 하지 말 것.
export const RANKING_SWITCH_THRESHOLD = 10

interface Rankable {
  recommendUserCount: number
  reaction: number
  latestCreatedAt: string
}

export function sortByGroupRanking<T extends Rankable>(
  cards: T[],
  groupRecordCount: number
): T[] {
  const byLatest = (a: T, b: T) => b.latestCreatedAt.localeCompare(a.latestCreatedAt)
  if (groupRecordCount < RANKING_SWITCH_THRESHOLD) {
    return [...cards].sort(byLatest)
  }
  return [...cards].sort(
    (a, b) =>
      b.recommendUserCount - a.recommendUserCount ||
      b.reaction - a.reaction ||
      byLatest(a, b)
  )
}
