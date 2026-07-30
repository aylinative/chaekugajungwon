export const RECOMMEND_GROUPS = [
  {
    value: 'seed',
    label: '씨앗',
    emoji: '🫘',
    ageRange: '0~12M',
    selectedClass: 'bg-group-seed text-white',
  },
  {
    value: 'sprout',
    label: '새싹',
    emoji: '🌱',
    ageRange: '12~18M',
    selectedClass: 'bg-group-sprout text-text',
  },
  {
    value: 'springflower',
    label: '봄꽃',
    emoji: '🌸',
    ageRange: '19~30M',
    selectedClass: 'bg-group-springflower text-white',
  },
  {
    value: 'apple',
    label: '사과',
    emoji: '🍎',
    ageRange: '31M~4Y',
    selectedClass: 'bg-group-apple text-white',
  },
  {
    value: 'tree',
    label: '나무',
    emoji: '🌳',
    ageRange: '5Y~',
    selectedClass: 'bg-group-tree text-white',
  },
  {
    value: 'adult',
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
