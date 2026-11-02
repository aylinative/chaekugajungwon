'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 운영자: 신고된 기록 처리 — '숨기기'(기록 숨김 + 신고 처리됨) / '문제없음'(신고만 닫음) (2026.11.03)
export default function ReportActions({ postId }: { postId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const close = (status: 'resolved' | 'dismissed') =>
    fetch('/api/moderation/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, status }),
    })

  const run = async (action: 'hide' | 'dismiss') => {
    if (pending) return
    if (action === 'hide' && !confirm('이 기록을 숨길까요? 숨긴 기록 목록에서 복구할 수 있어요.')) return
    setPending(true)
    try {
      if (action === 'hide') {
        const res = await fetch(`/api/posts/${postId}/hide`, { method: 'POST' })
        if (!res.ok) throw new Error('숨기지 못했어요.')
        await close('resolved')
      } else {
        await close('dismissed')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '처리하지 못했어요.')
      setPending(false)
    }
  }

  return (
    <div className="flex flex-shrink-0 flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run('hide')}
        className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        숨기기
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run('dismiss')}
        className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text/70 disabled:opacity-50"
      >
        문제없음
      </button>
    </div>
  )
}
