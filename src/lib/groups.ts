export const RECOMMEND_GROUPS = [
  {
    value: 'seed',
    ageLabel: '0~12개월',
    label: '씨앗',
    emoji: '🫘',
    ageRange: '0~12M',
    selectedClass: 'bg-group-seed text-white',
  },
  {
    value: 'sprout',
    ageLabel: '12~18개월',
    label: '새싹',
    emoji: '🌱',
    ageRange: '12~18M',
    selectedClass: 'bg-group-sprout text-text',
  },
  {
    value: 'springflower',
    ageLabel: '19~30개월',
    label: '봄꽃',
    emoji: '🌸',
    ageRange: '19~30M',
    selectedClass: 'bg-group-springflower text-white',
  },
  {
    value: 'apple',
    ageLabel: '31개월~4살',
    label: '사과',
    emoji: '🍎',
    ageRange: '31M~4Y',
    selectedClass: 'bg-group-apple text-white',
  },
  {
    value: 'tree',
    ageLabel: '5살 이상',
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

// 아이의 현재 월령 → 해당하는 시기 value (7장 연령 기준)
// 씨앗 0~12M 미만 / 새싹 12~18M / 봄꽃 19~30M / 사과 31M~4살(59M) / 나무 5살(60M) 이상
// '어른'은 연령 매핑 대상이 아님(자동 체크에 쓰지 않음)
export function getGroupValueByMonths(months: number): RecommendGroupValue {
  if (months < 12) return 'seed'
  if (months <= 18) return 'sprout'
  if (months <= 30) return 'springflower'
  if (months <= 59) return 'apple'
  return 'tree'
}
