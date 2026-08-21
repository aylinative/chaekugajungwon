// 기록 작성일 등 날짜 표기 — YYYY.M.D
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}
