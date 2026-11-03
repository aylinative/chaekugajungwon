'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 차단한 사람의 기록 자리에 씌우는 불투명 커버 (2026.11.03 운영자)
// - 기록을 빼버리면 '기록 1개'인데 아무것도 안 보여 이상하므로, 자리는 남기고 내용만 가린다(내용은 내려보내지 않음).
// - '차단 해제' → 차단 관리(/mypage/blocks?from=지금 페이지). 거기서 풀고 뒤로가기/돌아가기 하면 이 페이지로 돌아옴.
// - 뒤로가기는 브라우저가 이전 화면을 그대로 보여줄 수 있어서, 차단을 푼 기록(sessionStorage)이 있으면 새로 불러온다.
export const BLOCKS_CHANGED_KEY = 'chaekugajungwon_blocks_changed'

export default function BlockedCover({ from }: { from: string }) {
  const router = useRouter()

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BLOCKS_CHANGED_KEY)) {
        sessionStorage.removeItem(BLOCKS_CHANGED_KEY)
        router.refresh()
      }
    } catch {
      /* 저장소 접근 불가 — 새로고침하면 반영됨 */
    }
  }, [router])

  return (
    <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 bg-text/[0.06] px-4 py-6 text-center">
      <p className="text-sm text-text/55">내가 차단한 사람의 기록이에요</p>
      <Link
        href={`/mypage/blocks?from=${encodeURIComponent(from)}`}
        className="rounded-full bg-surface px-4 py-1.5 text-xs font-medium text-text/70 shadow-sm"
      >
        차단 해제
      </Link>
    </div>
  )
}
