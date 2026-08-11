'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 게시물 숨김 버튼 — 작성자 본인 또는 운영자에게만 렌더(서버에서 판별 후 전달).
export default function HidePostButton({ postId }: { postId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const hide = async () => {
    if (pending) return
    if (!confirm('이 기록을 숨길까요? 목록에서 보이지 않게 됩니다.')) return
    setPending(true)
    try {
      const res = await fetch(`/api/posts/${postId}/hide`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '숨김 처리에 실패했습니다.')
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '숨김 처리에 실패했습니다.')
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
      {pending ? '처리 중…' : '숨김'}
    </button>
  )
}
