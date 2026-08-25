// 글밥량 = 페이지당 글의 양. 그림책의 중립적 속성(품질 점수가 아님)이라
// 별(★)이 아니라 '글 적음—글 많음' 스펙트럼으로 표현한다. 1~5단계.
// 단계별 부연 문구(단일 소스) — 기록 폼·책 페이지·기록 상세가 공유.
export const DENSITY_HINTS: Record<number, string> = {
  0: '글 없는 그림책',
  1: '1~2단어',
  2: '1문장 내외',
  3: '2~3문장',
  4: '여러 문장',
  5: '글 많은 편',
}

export function densityHint(value: number): string {
  return DENSITY_HINTS[value] ?? ''
}
