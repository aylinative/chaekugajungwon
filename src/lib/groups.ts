export const RECOMMEND_GROUPS = [
  {
    value: 'seed',
    ageLabel: '0~12M',
    label: '씨앗',
    emoji: '🫘',
    ageRange: '0~12M',
    selectedClass: 'bg-group-seed text-white',
  },
  {
    value: 'sprout',
    ageLabel: '12~18M',
    label: '새싹',
    emoji: '🌱',
    ageRange: '12~18M',
    selectedClass: 'bg-group-sprout text-text',
  },
  {
    value: 'springflower',
    ageLabel: '19~30M',
    label: '꽃잎',
    emoji: '🌸',
    ageRange: '19~30M',
    selectedClass: 'bg-group-springflower text-white',
  },
  {
    value: 'apple',
    ageLabel: '31M~4Y',
    label: '열매',
    emoji: '🍎',
    ageRange: '31M~4Y',
    selectedClass: 'bg-group-apple text-white',
  },
  {
    value: 'tree',
    ageLabel: '5Y~',
    label: '나무',
    emoji: '🌳',
    ageRange: '5Y~',
    selectedClass: 'bg-group-tree text-white',
  },
  {
    value: 'adult',
    ageLabel: '어른도 함께',
    label: '어른',
    emoji: '👩‍👦',
    ageRange: '',
    selectedClass: 'bg-group-adult text-white',
  },
] as const

export type RecommendGroupValue = (typeof RECOMMEND_GROUPS)[number]['value']

// 한글 라벨 → 이모지 매핑 (카드/상세 등 라벨만 아는 곳에서 사용)
export const LABEL_TO_EMOJI: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.emoji])
)

// 한글 라벨을 연령 오름차순(씨앗→어른)으로 — 분포 x축·대표 시기 계산에 사용
export const GROUP_LABELS_ORDERED: string[] = RECOMMEND_GROUPS.map((g) => g.label)

// SEO(타이틀·검색어)용 한글 풀 연령 표기 — 화면 표기는 M/Y(ageLabel), 메타데이터는 한글
export const AGE_LABEL_FULL: Record<string, string> = {
  씨앗: '0~12개월',
  새싹: '12~18개월',
  꽃잎: '19~30개월',
  열매: '31개월~4살',
  나무: '5살 이상',
  어른: '어른도 함께',
}

// 시기 라벨 배열을 연령 오름차순으로 정렬 (대표 시기 = 첫 번째)
export function sortGroupLabelsByAge(labels: string[]): string[] {
  return [...labels].sort(
    (a, b) => GROUP_LABELS_ORDERED.indexOf(a) - GROUP_LABELS_ORDERED.indexOf(b)
  )
}

// 아이의 현재 월령 → 해당하는 시기 value (7장 연령 기준)
// 씨앗 0~12M 미만 / 새싹 12~18M / 꽃잎 19~30M / 열매 31M~4살(59M) / 나무 5살(60M) 이상
// '어른'은 연령 매핑 대상이 아님(자동 체크에 쓰지 않음)
export function getGroupValueByMonths(months: number): RecommendGroupValue {
  if (months < 12) return 'seed'
  if (months <= 18) return 'sprout'
  if (months <= 30) return 'springflower'
  if (months <= 59) return 'apple'
  return 'tree'
}
