'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { REPORT_REASONS, type ReportReason } from '@/lib/reports'

// 기록 신고 바텀시트 (애플 1.2·구글 UGC 정책, 2026.11.03) — 사유 선택 + 짧은 설명(선택)
export default function ReportSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const submit = async () => {
    if (!reason || pending) return
    setPending(true)
    setError('')
    try {
      const res = await fetch(`/api/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, detail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '신고하지 못했어요.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '신고하지 못했어요.')
    } finally {
      setPending(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-surface p-5 pb-8 shadow-lg">
        {done ? (
          <>
            <p className="text-center text-sm font-semibold text-text">신고가 접수됐어요</p>
            <p className="mt-2 text-center text-xs leading-relaxed text-text/60">
              운영자가 확인 후 조치할게요. 이 사람의 기록을 보고 싶지 않으면 &lsquo;차단&rsquo;도 할 수 있어요.
            </p>
            <button type="button" onClick={onClose} className="mt-5 min-h-[48px] w-full rounded-2xl bg-main text-sm font-semibold text-white">
              확인
            </button>
          </>
        ) : (
          <>
            <p className="mb-3 text-center text-sm font-semibold text-text">이 기록을 신고하는 이유를 골라 주세요</p>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  aria-pressed={reason === r.value}
                  className={`flex min-h-[44px] w-full items-center rounded-xl px-4 text-left text-sm ${
                    reason === r.value ? 'bg-main font-medium text-white' : 'bg-surface-muted text-text/80'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="자세한 내용 (선택)"
              className="mt-3 w-full rounded-xl border border-black/10 bg-surface px-3 py-2 text-sm outline-none focus:border-main"
            />
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onClose} className="min-h-[48px] flex-1 rounded-2xl bg-surface-muted text-sm text-text/70">
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!reason || pending}
                className="min-h-[48px] flex-1 rounded-2xl bg-red-500 text-sm font-semibold text-white disabled:opacity-40"
              >
                {pending ? '보내는 중…' : '신고하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
