'use client'

import { useState } from 'react'

const CONFIRM_WORD = '탈퇴'

// 탈퇴 확인 — '탈퇴'를 직접 입력해야 버튼이 켜진다(실수 방지). 성공하면 로그인 화면으로 이동.
export default function WithdrawForm() {
  const [word, setWord] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const ready = word.trim() === CONFIRM_WORD

  const submit = async () => {
    if (!ready || pending) return
    setPending(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '탈퇴 처리에 실패했어요.')
      window.location.replace('/?withdrawn=1') // 세션이 지워졌으니 전체 새로고침으로 이동
    } catch (err) {
      setError(err instanceof Error ? err.message : '탈퇴 처리에 실패했어요.')
      setPending(false)
    }
  }

  return (
    <section className="mt-6">
      <label className="block text-sm font-medium text-text">
        확인을 위해 &lsquo;{CONFIRM_WORD}&rsquo;를 입력해 주세요
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          className="mt-2 min-h-[44px] w-full rounded-xl border border-black/10 bg-surface px-3 text-sm outline-none focus:border-main"
        />
      </label>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={!ready || pending}
        className="mt-4 min-h-[48px] w-full rounded-2xl bg-red-500 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? '탈퇴 처리 중…' : '탈퇴하기'}
      </button>
    </section>
  )
}
