import { GROUP_LABELS_ORDERED, RECOMMEND_GROUPS } from '@/lib/groups'

// 책 단위 '추천 시기 분포' (CLAUDE.md 10.3 분포 표시 형태)
// - 세로 막대 6칸, x축은 씨앗→어른 연령 오름차순 고정 (시기는 순서형 변수). 0인 시기도 자리 유지
// - 단색: 가장 많은 시기(동점이면 모두)만 진하게, 나머지 흐리게 (시기 배지 6색 금지)
// - 숫자 없이 막대 길이로만 비교 (2026.11.13 운영자)
// - 추천한 사람(중복 제거)이 MIN_VOTERS_FOR_DISTRIBUTION명 미만이면 영역을 아예 그리지 않음 — 호출부에서도 확인
// 바텀시트(완료 후)와 책 페이지(상시)에서 공용.

export const MIN_VOTERS_FOR_DISTRIBUTION = 5

interface Props {
  votes: Record<string, number> // 한글 라벨 → 추천한 사람 수 (distinct user)
  totalVoters: number // 시기를 1개 이상 고른 사람 수 (distinct user)
  myGroups?: string[] // 내가 고른 시기(라벨만 진하게 — 바텀시트)
}

// 가장 많은 시기(동점이면 전부, 연령 오름차순). topLabel = 그중 가장 어린 시기 —
// 책 페이지 generateMetadata의 단일 연령그룹 값으로 사용 (10.3)
export function getDistributionSummary(
  votes: Record<string, number>,
  totalVoters: number
): { topLabel: string | null; topLabels: string[]; summary: string } {
  const topVotes = Math.max(0, ...GROUP_LABELS_ORDERED.map((l) => votes[l] ?? 0))
  if (topVotes === 0 || totalVoters === 0) {
    return { topLabel: null, topLabels: [], summary: '' }
  }
  const topLabels = GROUP_LABELS_ORDERED.filter((l) => (votes[l] ?? 0) === topVotes)
  // 1위가 하나면 연령 범위 병기(씨앗(0~11M)), 동점이면 이름만 이어서(씨앗·새싹)
  const name =
    topLabels.length === 1
      ? `${topLabels[0]}(${RECOMMEND_GROUPS.find((g) => g.label === topLabels[0])?.ageLabel ?? ''})`
      : topLabels.join('·')
  return { topLabel: topLabels[0], topLabels, summary: `${name} 시기에 가장 많이 추천했어요` }
}

export default function PeriodDistribution({ votes, totalVoters, myGroups = [] }: Props) {
  if (totalVoters < MIN_VOTERS_FOR_DISTRIBUTION) return null

  const max = Math.max(...GROUP_LABELS_ORDERED.map((l) => votes[l] ?? 0), 1)
  const { topLabels, summary } = getDistributionSummary(votes, totalVoters)

  return (
    <div>
      <p className="mb-3 text-xs text-text/70">{summary}</p>
      <div className="flex items-end justify-between gap-2 px-1" style={{ height: 80 }}>
        {GROUP_LABELS_ORDERED.map((label) => {
          const v = votes[label] ?? 0
          const top = topLabels.includes(label)
          const barH = v === 0 ? 2 : Math.max(6, Math.round((v / max) * 72))
          return (
            <div key={label} className="flex flex-1 flex-col items-center justify-end">
              <div
                className={`w-full rounded-t ${top ? 'bg-main' : 'bg-main/25'}`}
                style={{ height: barH }}
                aria-label={`${label} ${v}명`}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between gap-1 px-1">
        {RECOMMEND_GROUPS.map((group) => {
          const strong = myGroups.includes(group.label) || topLabels.includes(group.label)
          return (
            <span key={group.value} className="flex flex-1 flex-col items-center">
              <span
                className={`text-[11px] ${
                  strong ? 'font-semibold text-main' : 'text-text/50'
                }`}
              >
                {group.label}
              </span>
              {/* 시기 이름만으로는 기준을 모르므로 연령 기간 병기 (개월=M, 살=Y) */}
              <span
                className={`text-[9px] leading-tight ${
                  strong ? 'text-main/70' : 'text-text/35'
                }`}
              >
                {group.ageLabel}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
