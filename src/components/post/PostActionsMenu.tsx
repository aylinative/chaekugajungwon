'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ReportSheet from '@/components/report/ReportSheet'
import { blockUser } from '@/components/report/ReportBlockActions'

// 기록 상세 상단 우측 ⋯(점 3개) 메뉴 — 수정/공유/삭제(또는 숨김)를 접어둔다.
// 삭제/숨김은 소프트 삭제(hidden_at) 동일. 작성자='삭제', 운영자 타인글='숨김'.
// 남의 기록이면 '신고하기'·'이 사용자 차단'(애플 1.2·구글 UGC 정책, 2026.11.03).
export default function PostActionsMenu({
  postId,
  sharePath,
  shareTitle,
  shareText,
  canEdit = false,
  canModerate = false,
  moderateLabel = '삭제',
  moderateConfirm = '이 기록을 삭제할까요? 목록에서 보이지 않게 됩니다.',
  report,
}: {
  postId: string
  sharePath: string
  shareTitle: string
  shareText: string
  canEdit?: boolean
  canModerate?: boolean
  moderateLabel?: string
  moderateConfirm?: string
  report?: { authorId: string; authorNickname: string | null } // 로그인한 남의 기록일 때만
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const share = async () => {
    setOpen(false)
    const url = `${window.location.origin}${sharePath}`
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url })
      } catch {
        /* 사용자가 취소 */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        alert('링크가 복사됐어요.')
      } catch {
        alert(url)
      }
    }
  }

  const moderate = async () => {
    if (pending) return
    if (!confirm(moderateConfirm)) return
    setPending(true)
    try {
      const res = await fetch(`/api/posts/${postId}/hide`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `${moderateLabel} 처리에 실패했습니다.`)
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : `${moderateLabel} 처리에 실패했습니다.`)
      setPending(false)
    }
  }

  const itemClass =
    'block w-full px-4 py-2 text-left text-sm text-text hover:bg-surface-muted'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="더보기"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-text/60 hover:bg-surface-muted"
      >
        {/* 점 3개(가로) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && (
        <>
          {/* 바깥 클릭 시 닫힘 */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-32 overflow-hidden rounded-xl border border-black/5 bg-white py-1 shadow-lg">
            {canEdit && (
              <Link
                href={`/recommend/create?edit=${postId}`}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                수정
              </Link>
            )}
            <button type="button" onClick={share} className={itemClass}>
              공유
            </button>
            {report && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setReportOpen(true)
                  }}
                  className={itemClass}
                >
                  신고하기
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false)
                    if (await blockUser(report.authorId, report.authorNickname)) router.refresh()
                  }}
                  className={itemClass}
                >
                  이 사용자 차단
                </button>
              </>
            )}
            {canModerate && (
              <button
                type="button"
                onClick={moderate}
                disabled={pending}
                className={`${itemClass} text-red-500 disabled:opacity-50`}
              >
                {pending ? '처리 중…' : moderateLabel}
              </button>
            )}
          </div>
        </>
      )}
      {reportOpen && <ReportSheet postId={postId} onClose={() => setReportOpen(false)} />}
    </div>
  )
}
