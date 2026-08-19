'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 게시물 숨김/삭제 버튼 — 작성자 본인 또는 운영자에게만 렌더(서버에서 판별 후 전달).
// 내부 동작은 소프트 삭제(hidden_at) 동일. 작성자에겐 '삭제', 운영자에겐 '숨김'으로 표기.
export default function HidePostButton({
  postId,
  label = '숨김',
  confirmText = '이 기록을 숨길까요? 목록에서 보이지 않게 됩니다.',
  stay = false, // true=그 자리 새로고침(마이페이지) / false=홈으로 이동(상세)
}: {
  postId: string
  label?: string
  confirmText?: string
  stay?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const hide = async () => {
    if (pending) return
    if (!confirm(confirmText)) return
    setPending(true)
    try {
      const res = await fetch(`/api/posts/${postId}/hide`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `${label} 처리에 실패했습니다.`)
      }
      if (!stay) router.push('/')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : `${label} 처리에 실패했습니다.`)
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={hide}
      disabled={pending}
      className="text-xs text-text/40 disabled:opacity-50"
    >
      {pending ? '처리 중…' : label}
    </button>
  )
}
