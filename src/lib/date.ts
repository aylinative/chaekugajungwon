// 기록 작성일 등 날짜 표기 — YYYY.M.D
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

// 책육아 일기 날짜('YYYY-MM-DD', 시간대 없음) 표기 — YYYY.M.D (기기 시간대와 무관하게 그 날짜 그대로)
export function formatYmd(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  return `${y}.${m}.${d}`
}
