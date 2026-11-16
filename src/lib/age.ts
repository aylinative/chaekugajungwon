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

// 특정 날짜(YYYY-MM-DD) 기준 만 개월 수 — 책육아 일기 날짜의 아이 나이(2026.11.17). 그 날짜에 아직 안 태어났으면 null
export function getMonthsAt(birthDate: string, onDate: string): number | null {
  const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number)
  const [y, m, d] = onDate.slice(0, 10).split('-').map(Number)
  let months = (y - by) * 12 + (m - bm)
  if (d < bd) months--
  return months < 0 ? null : months
}

// 개월 수 → 표기 (11.2 규칙과 동일: 36개월 미만 OO개월 / 만 3·4·5살 / 초등학생 이상)
export function formatAgeMonths(months: number): string {
  if (months < 36) return `${months}개월`
  if (months < 48) return '만 3살'
  if (months < 60) return '만 4살'
  if (months < 72) return '만 5살'
  return '초등학생 이상'
}

// 일기 날짜 기준 아이들 나이 한 줄 — '🐯 47개월 · 🐰 18개월'. ⚠️ 작성자 본인 화면에서만 (아이 정보는 개인정보, 10.1)
export function childAgesAt(children: { birth_date: string }[], onDate: string): string {
  return children
    .map((c) => {
      const m = getMonthsAt(c.birth_date, onDate)
      return m === null ? null : `${getZodiacEmoji(Number(c.birth_date.slice(0, 4)))} ${formatAgeMonths(m)}`
    })
    .filter(Boolean)
    .join(' · ')
}

// 오늘 날짜(KST) 'YYYY-MM-DD'
export function todayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}
