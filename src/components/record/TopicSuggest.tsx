'use client'

import { useState } from 'react'

// '찾는 주제가 없나요?' — 운영자에게 주제 제안 (Part 2). 기록 저장과 별개로 즉시 전송.
// 제안한 주제는 이 기록의 태그로 저장되지 않는다.
export default function TopicSuggest({ bookKey }: { bookKey: string | null }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const send = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/topic-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, book_key: bookKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '보내지 못했어요.')
      setText('')
      setMessage('알려주셔서 고마워요. 주제를 추가할 때 참고할게요.')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '보내지 못했어요.')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full text-center text-[13px] text-text/50 underline-offset-2 hover:underline"
      >
        찾는 주제가 없나요?
      </button>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-muted p-3">
      <p className="mb-2 text-[13px] font-medium text-text/80">찾는 주제가 없나요?</p>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 30))}
          maxLength={30}
          placeholder="예: 이사, 캠핑, 한글날"
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/10 bg-surface px-3 text-sm outline-none focus:border-main"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || sending}
          className="min-h-[44px] flex-shrink-0 rounded-xl bg-main px-3 text-[13px] font-medium text-white disabled:opacity-40"
        >
          운영자에게 알리기
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-text/45">모인 의견을 보고 주제를 추가해요</p>
      {message && <p className="mt-1.5 text-xs text-main">{message}</p>}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
