import { todayKST } from '@/lib/age'

// 책육아 일기 날짜(posts.diary_date) 검사 (2026.11.17) — 'YYYY-MM-DD', 실제 있는 날짜, 2000년 이후, 오늘(KST)까지(미래 불가).
// 맞으면 그 문자열, 아니면 null. 저장 API(새 기록·수정) 공용.
export function validDiaryDate(input: unknown): string | null {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null
  const d = new Date(`${input}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input) return null
  if (input < '2000-01-01' || input > todayKST()) return null
  return input
}
