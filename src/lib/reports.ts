// 신고 사유 (supabase/add_reports_blocks.sql의 reports.reason CHECK와 같은 값) — 2026.11.03
export const REPORT_REASONS = [
  { value: 'inappropriate', label: '부적절한 내용' },
  { value: 'privacy', label: '아이 등 개인정보 노출' },
  { value: 'spam', label: '광고·스팸' },
  { value: 'copyright', label: '저작권 침해' },
  { value: 'other', label: '기타' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

export const REPORT_REASON_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label])
)

export const isReportReason = (v: unknown): v is ReportReason =>
  typeof v === 'string' && REPORT_REASONS.some((r) => r.value === v)
