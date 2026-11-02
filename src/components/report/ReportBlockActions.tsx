'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReportSheet from '@/components/report/ReportSheet'

// 남의 기록 카드 하단의 '신고 · 차단' (책 페이지 기록 카드용, 2026.11.03)
// 차단하면 그 사람의 기록이 나에게만 안 보인다 — 화면을 새로고침해 바로 반영.
export async function blockUser(userId: string, nickname: string | null): Promise<boolean> {
  if (!confirm(`${nickname ?? '이 사용자'}님을 차단할까요?\n차단하면 이 사람의 기록이 나에게 보이지 않아요. 마이페이지에서 풀 수 있어요.`))
    return false
  const res = await fetch(`/api/users/${userId}/block`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    alert(data.error || '차단하지 못했어요.')
    return false
  }
  return true
}

export default function ReportBlockActions({
  postId,
  authorId,
  authorNickname,
}: {
  postId: string
  authorId: string
  authorNickname: string | null
}) {
  const router = useRouter()
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setReportOpen(true)} className="text-xs text-text/40">
        신고
      </button>
      <button
        type="button"
        onClick={async () => {
          if (await blockUser(authorId, authorNickname)) router.refresh()
        }}
        className="text-xs text-text/40"
      >
        차단
      </button>
      {reportOpen && <ReportSheet postId={postId} onClose={() => setReportOpen(false)} />}
    </>
  )
}
