const ZODIAC_EMOJIS = ['🐵', '🐔', '🐶', '🐷', '🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑']
const ZODIAC_NAMES = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양']

// year % 12: 0=원숭이, 1=닭, 2=개, 3=돼지, 4=쥐(2020), 5=소, 6=호랑이, 7=토끼, 8=용(2024), 9=뱀, 10=말, 11=양
export function getZodiacEmoji(year: number): string {
  return ZODIAC_EMOJIS[year % 12]
}

export function getZodiacName(year: number): string {
  return ZODIAC_NAMES[year % 12]
}

// 현재 만 개월 수 (일 단위 반영: 이번 달 생일이 안 지났으면 한 달 덜 찬 것)
export function getMonths(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months--
  return Math.max(0, months)
}

export function getAgeDisplay(birthDate: string): string {
  const months = getMonths(birthDate)
  if (months < 36) return `${months}개월`
  if (months < 48) return '만 3살'
  if (months < 60) return '만 4살'
  if (months < 72) return '만 5살'
  return '초등학생 이상'
}
