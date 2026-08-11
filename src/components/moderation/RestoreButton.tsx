'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 숨김 복구 버튼 (운영자 전용 화면에서 사용)
export default function RestoreButton({
  type,
  id,
}: {
  type: 'post' | 'comment'
  id: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const restore = async () => {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch('/api/moderation/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '복구에 실패했습니다.')
      }
      router.refresh() // 목록에서 사라짐(다시 노출 상태가 됨)
    } catch (err) {
      alert(err instanceof Error ? err.message : '복구에 실패했습니다.')
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={restore}
      disabled={pending}
      className="flex-shrink-0 rounded-full bg-main px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
    >
      {pending ? '복구 중…' : '복구'}
    </button>
  )
}
