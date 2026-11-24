'use client'

import { openLoginSheet } from '@/components/auth/LoginSheet'

// 로그인 전(카카오톡 안 브라우저 등 — 크롬·앱과 로그인이 따로)에서 [기록 남기기]를 누르면
// 그 자리에서 로그인 시트 → 로그인하면 그 책이 골라진 기록하기로 (2026.11.24)
export default function RecordNudgeLoginButton({ next, className, children }: { next: string; className: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => openLoginSheet('record', next)} className={className}>
      {children}
    </button>
  )
}
