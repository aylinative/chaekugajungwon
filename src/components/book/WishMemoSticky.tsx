'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// 읽고 싶은 책 '추천이유' 메모 — 책 표지에 붙인 포스트잇 (2026.11.20).
// 저장(북마크)한 본인에게만 보인다(bookmarks.memo, 본인만 읽기). 공개 기록 카드와 다른 재질(메모지)로 '내 개인 메모'임을 드러내고,
// 표지 위에 떠 있어 아래 버튼 줄을 밀지 않는다. ✕ = 표지 귀퉁이 '추천이유' 탭으로 접기 / 메모 글씨 = 시트에서 보기·고치기·지우기.
// 부모(표지 감싸는 div)는 relative여야 한다. 저장 해제·재저장은 BookmarkButton의 'bookmark-change' 이벤트로 따라간다.

export const WISH_MEMO_MAX = 200
const PAPER = 'bg-[#FBEFB8] text-[#5A4A2A] shadow-[0_3px_8px_rgba(58,51,43,0.18)]' // 바랜 메모지 색 — 개인 메모 전용

export async function saveWishMemo(bookId: string, memo: string): Promise<string> {
  const res = await fetch(`/api/books/${bookId}/bookmark`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memo }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '메모를 저장하지 못했어요.')
  return (data.memo as string | null) ?? ''
}

function MemoSheet({
  bookId,
  memo,
  onSaved,
  onClose,
}: {
  bookId: string
  memo: string
  onSaved: (m: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(memo)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const save = async (value: string) => {
    if (pending) return
    setPending(true)
    setError('')
    try {
      onSaved(await saveWishMemo(bookId, value))
    } catch (err) {
      setError(err instanceof Error ? err.message : '메모를 저장하지 못했어요.')
      setPending(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="추천받은 이유">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-bg px-5 pb-safe pt-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-text">추천받은 이유</p>
          <button type="button" onClick={onClose} className="-mr-2 px-2 py-1 text-sm text-text/50">
            닫기
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, WISH_MEMO_MAX))}
          rows={4}
          autoFocus
          placeholder="누가, 왜 추천했는지 적어 두세요 (나만 보여요)"
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-main"
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-red-500">{error}</span>
          <span className="text-text/35">
            {draft.length}/{WISH_MEMO_MAX}
          </span>
        </div>
        <div className="mb-4 mt-3 flex gap-2">
          {memo && (
            <button
              type="button"
              disabled={pending}
              onClick={() => save('')}
              className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-text/60 disabled:opacity-50"
            >
              지우기
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => save(draft)}
            className="flex-1 rounded-2xl bg-main py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function WishMemoSticky({
  bookId,
  initialBookmarked,
  initialMemo,
}: {
  bookId: string
  initialBookmarked: boolean
  initialMemo: string
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [memo, setMemo] = useState(initialMemo)
  const [folded, setFolded] = useState(false)
  const [sheet, setSheet] = useState(false)

  // 저장 버튼으로 해제하면 메모도 함께 사라지고(행 삭제), 다시 저장하면 빈 메모로 시작
  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ bookId: string; bookmarked: boolean }>).detail
      if (d?.bookId !== bookId) return
      setBookmarked(d.bookmarked)
      if (!d.bookmarked) setMemo('')
      setFolded(false)
    }
    window.addEventListener('bookmark-change', onChange)
    return () => window.removeEventListener('bookmark-change', onChange)
  }, [bookId])

  if (!bookmarked) return null

  return (
    <>
      {memo && !folded ? (
        <div className={`absolute -bottom-3 left-2 z-10 w-44 -rotate-2 rounded-sm px-2.5 pb-2 pt-1.5 ${PAPER}`}>
          {/* 테이프 */}
          <span className="absolute -top-1.5 left-1/2 h-3 w-10 -translate-x-1/2 rotate-2 bg-white/60" aria-hidden />
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-label="추천받은 이유 보기·고치기"
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-[11px] leading-snug">
                <span className="font-semibold">추천이유 :</span> {memo}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFolded(true)}
              aria-label="메모 접기"
              className="-mr-1 -mt-0.5 px-1 text-[11px] leading-none opacity-50"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        // 접힌 상태 / 메모 없음 — 표지 귀퉁이 작은 메모지 탭
        <button
          type="button"
          onClick={() => (memo ? setFolded(false) : setSheet(true))}
          aria-label={memo ? '추천받은 이유 펼치기' : '추천받은 이유 적기'}
          className={`absolute -right-2 bottom-2 z-10 rotate-3 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${PAPER}`}
        >
          {memo ? '추천이유' : '+ 추천이유'}
        </button>
      )}
      {sheet && (
        <MemoSheet
          bookId={bookId}
          memo={memo}
          onClose={() => setSheet(false)}
          onSaved={(m) => {
            setMemo(m)
            setFolded(false)
            setSheet(false)
          }}
        />
      )}
    </>
  )
}
