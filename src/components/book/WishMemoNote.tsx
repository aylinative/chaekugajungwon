'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// 읽고 싶은 책 '추천이유' 메모 (2026.11.20) — 저장(북마크)한 본인에게만(bookmarks.memo, 본인만 읽기).
// 자리: 책 정보 오른쪽 칸('책 정보 보기' 아래 비어 있던 곳) — 표지·소개를 가리지 않고, 내용 길이만큼만 차지.
// 모양: 상자·색·아이콘 없이 작은 회색 글자 한 줄(최대 2줄) — '나만 보는 메모' 정도의 존재감(2026.11.20 운영자).
//   초록 칩+북마크 아이콘 안은 크고 '저장됨' 버튼과 겹쳐 보여 폐기. 누르면 시트에서 보기·고치기·지우기. 메모 없으면 '+ 추천이유 메모'. 저장 해제·재저장은 'bookmark-change' 이벤트로 따라간다.
// ⚠️ 표지 위 포스트잇(노랑·기울기·고정폭) 안은 기존 UI와 안 맞아 폐기(2026.11.20 운영자).

export const WISH_MEMO_MAX = 200

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

export default function WishMemoNote({
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
  const [sheet, setSheet] = useState(false)

  // 저장 버튼으로 해제하면 메모도 함께 사라지고(행 삭제), 다시 저장하면 빈 메모로 시작
  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ bookId: string; bookmarked: boolean }>).detail
      if (d?.bookId !== bookId) return
      setBookmarked(d.bookmarked)
      if (!d.bookmarked) setMemo('')
    }
    window.addEventListener('bookmark-change', onChange)
    return () => window.removeEventListener('bookmark-change', onChange)
  }, [bookId])

  if (!bookmarked) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet(true)}
        aria-label={memo ? '추천받은 이유 보기·고치기' : '추천받은 이유 적기'}
        className="mt-2 block max-w-full text-left text-xs leading-snug text-text/40"
      >
        {memo ? (
          <span className="line-clamp-2">
            <span className="text-text/55">추천이유 :</span> {memo}
          </span>
        ) : (
          '+ 추천이유 메모'
        )}
      </button>
      {sheet && (
        <MemoSheet
          bookId={bookId}
          memo={memo}
          onClose={() => setSheet(false)}
          onSaved={(m) => {
            setMemo(m)
            setSheet(false)
          }}
        />
      )}
    </>
  )
}
