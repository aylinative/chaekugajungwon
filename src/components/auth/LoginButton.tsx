'use client'

import { openLoginSheet } from '@/components/auth/LoginSheet'

// 홈 헤더의 작은 '로그인' 버튼 (로그인 안 했을 때만, 2026.11.04)
export default function LoginButton() {
  return (
    <button
      type="button"
      onClick={() => openLoginSheet('default')}
      className="rounded-full border border-main/30 px-3 py-1 text-xs font-medium text-main"
    >
      로그인
    </button>
  )
}
