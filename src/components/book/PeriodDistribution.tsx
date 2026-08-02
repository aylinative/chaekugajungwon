import { GROUP_LABELS_ORDERED, RECOMMEND_GROUPS } from '@/lib/groups'

// 책 단위 '추천 시기 분포' (CLAUDE.md 10.3 분포 표시 형태)
// - 세로 막대 6칸, x축은 씨앗→어른 연령 오름차순 고정 (시기는 순서형 변수)
// - 단색: 내가 고른 칸만 진하게, 나머지 흐리게 (시기 배지 6색 금지)
// - 비율이 아니라 절대값 + 총 표 수 표기
// - 5표 미만이면 막대 대신 텍스트 (2표짜리 막대는 정보가 아니라 오해)
// 바텀시트(완료 후)와 책 페이지(상시)에서 공용.

const MIN_VOTES_FOR_BARS = 5

interface Props {
  votes: Record<string, number> // 한글 라벨 → 추천한 사람 수 (distinct user)
  totalVoters: number // 시기를 1개 이상 고른 투표자 수
  myGroups?: string[] // 내가 고른 시기(진하게 표시)
}

// 요약 문장 로직 — 책 페이지 generateMetadata의 연령그룹 값과 동일 규칙으로 사용 (10.3)
export function getDistributionSummary(
  votes: Record<string, number>,
  totalVoters: number
): { topLabel: string | null; summary: string } {
  let topLabel: string | null = null
  let topVotes = 0
  for (const label of GROUP_LABELS_ORDERED) {
    const v = votes[label] ?? 0
    if (v > topVotes) {
      topVotes = v
      topLabel = label
    }
  }
  if (!topLabel || totalVoters === 0) {
    return { topLabel: null, summary: '' }
  }
  const summary =
    topVotes / totalVoters >= 0.4
      ? `${topLabel} 시기에 가장 많아요`
      : '여러 시기에 걸쳐 추천돼요'
  return { topLabel, summary }
}

export default function PeriodDistribution({ votes, totalVoters, myGroups = [] }: Props) {
  if (totalVoters < MIN_VOTES_FOR_BARS) {
    return (
      <p className="py-3 text-center text-sm text-text/60">
        {totalVoters === 0
          ? '아직 추천한 사람이 없어요'
          : `아직 ${totalVoters}명이 추천했어요`}
      </p>
    )
  }

  const max = Math.max(...GROUP_LABELS_ORDERED.map((l) => votes[l] ?? 0), 1)
  const { summary } = getDistributionSummary(votes, totalVoters)

  return (
    <div>
      <div className="flex items-end justify-between gap-2 px-1" style={{ height: 96 }}>
        {GROUP_LABELS_ORDERED.map((label) => {
          const v = votes[label] ?? 0
          const mine = myGroups.includes(label)
          const barH = v === 0 ? 2 : Math.max(6, Math.round((v / max) * 72))
          return (
            <div key={label} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className={`text-[10px] ${mine ? 'font-bold text-main' : 'text-text/40'}`}>
                {v}
              </span>
              <div
                className={`w-full rounded-t ${mine ? 'bg-main' : 'bg-main/25'}`}
                style={{ height: barH }}
                aria-label={`${label} ${v}명`}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between gap-1 px-1">
        {RECOMMEND_GROUPS.map((group) => {
          const mine = myGroups.includes(group.label)
          return (
            <span key={group.value} className="flex flex-1 flex-col items-center">
              <span
                className={`text-[11px] ${
                  mine ? 'font-semibold text-main' : 'text-text/50'
                }`}
              >
                {group.label}
              </span>
              {/* 시기 이름만으로는 기준을 모르므로 연령 기간 병기 (개월=M, 살=Y) */}
              <span
                className={`text-[9px] leading-tight ${
                  mine ? 'text-main/70' : 'text-text/35'
                }`}
              >
                {group.ageLabel}
              </span>
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-text/60">
        {summary} <span className="text-text/40">· 총 {totalVoters}명</span>
      </p>
    </div>
  )
}
