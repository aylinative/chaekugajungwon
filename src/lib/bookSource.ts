// 책 정보 검색처 전환 스위치 — 카카오 → 예스24 (2026.11.17 결정)
//
// 환경변수 YES24_START_AT(예: 2026-11-25T00:00:00+09:00)의 시각부터 새 검색은 예스24를 쓴다.
//   · 값이 없거나 그 전이면 지금처럼 카카오.
//   · 예스24 키(YES24_API_KEY)가 없어도 카카오.
//   · 예스24가 점검·장애·한도 초과면 그 요청은 카카오로 대신한다(/api/books/search).
// 약관·개인정보처리방침도 같은 시각을 시행일로 쓴다(시행 7일 전 공지 — /terms '약관의 변경').
// ⚠️ 서버 전용. 클라이언트에서 import하지 말 것(키 노출 방지 — 예스24 약관).

export function yes24StartAt(): Date | null {
  const raw = process.env.YES24_START_AT
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isYes24Active(now: Date = new Date()): boolean {
  const start = yes24StartAt()
  return Boolean(start && process.env.YES24_API_KEY && now >= start)
}

// 약관·개인정보처리방침·홈 공지용 단계 — 시행 7일 전 공지(/terms '약관의 변경')
//   none: 전환 일정 없음 / upcoming: 시행 전(공지 중) / active: 시행 후(새 문구)
export type BookSourcePhase = 'none' | 'upcoming' | 'active'

export function bookSourcePhase(now: Date = new Date()): { phase: BookSourcePhase; startLabel: string } {
  const start = yes24StartAt()
  if (!start) return { phase: 'none', startLabel: '' }
  // KST 날짜로 표기 — '2026년 11월 25일'
  const k = new Date(start.getTime() + 9 * 60 * 60 * 1000)
  const startLabel = `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`
  return { phase: now >= start ? 'active' : 'upcoming', startLabel }
}

// 저장된 책이 예스24에서 온 것인지 — 출처 표기('도서 DB 제공: 예스24')는 이 책에만
export function isYes24Book(sourceUrl: string | null | undefined): boolean {
  return Boolean(sourceUrl && /(^|\.)yes24\.com\//i.test(sourceUrl.replace(/^https?:\/\//, '')))
}
