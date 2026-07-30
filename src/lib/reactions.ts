// 우리 아이 반응 (재독 흡수한 3단계).
// 값이 클수록 긍정. 홈 피드(커뮤니티 추천)에는 RECOMMENDED_MIN 이상만 노출.
export const CHILD_REACTIONS = [
  { value: 3, label: '자꾸 꺼내봐요', emoji: '🥰' },
  { value: 2, label: '재밌어했어요', emoji: '😄' },
  { value: 1, label: '그냥 봤어요', emoji: '🙂' },
] as const

export type ChildReactionValue = (typeof CHILD_REACTIONS)[number]['value']

// 추천(피드 노출) 기준: '자꾸 꺼내봐요'(3), '재밌어했어요'(2)만.
export const RECOMMENDED_REACTION_MIN = 2

export const REACTION_BY_VALUE: Record<number, { label: string; emoji: string }> =
  Object.fromEntries(CHILD_REACTIONS.map((r) => [r.value, { label: r.label, emoji: r.emoji }]))

export function isRecommended(reaction: number): boolean {
  return reaction >= RECOMMENDED_REACTION_MIN
}
