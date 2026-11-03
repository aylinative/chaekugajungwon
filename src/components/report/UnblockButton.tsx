'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BLOCKS_CHANGED_KEY } from '@/components/report/BlockedCover'

// 차단 해제 버튼 — 기록 상세의 '차단한 사용자' 안내·마이페이지 차단 목록 공용 (2026.11.03)
export default function UnblockButton({ userId, className }: { userId: string; className?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        const res = await fetch(`/api/users/${userId}/block`, { method: 'DELETE' })
        if (!res.ok) {
          alert('차단을 풀지 못했어요.')
          setPending(false)
          return
        }
        try {
          sessionStorage.setItem(BLOCKS_CHANGED_KEY, String(Date.now())) // 뒤로가기로 돌아간 화면이 새로 불러오게
        } catch {}
        router.refresh()
      }}
      className={className ?? 'rounded-full bg-surface-muted px-4 py-1.5 text-xs font-medium text-text/70 disabled:opacity-50'}
    >
      {pending ? '푸는 중…' : '차단 풀기'}
    </button>
  )
}
