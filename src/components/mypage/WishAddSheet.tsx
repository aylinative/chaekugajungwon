'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import BookCover from '@/components/BookCover'
import BarcodeScanner, { CameraIcon } from '@/components/record/BarcodeScanner'
import { saveWishMemo, WISH_MEMO_MAX } from '@/components/book/WishMemoNote'

// books.book_key와 같은 규칙(lib/bookUpsert bookKeyOf) — 서버 모듈을 브라우저로 끌고 오지 않게 여기 따로 둔다
const bookKeyOf = (b: { isbn13: string; link: string; title: string }) => b.isbn13 || b.link || b.title

// 마이페이지 '아이와 읽고 싶은 책' 제목 줄의 (+) → 책 검색 시트 (2026.11.17)
// 어디선가 추천받은 책을 잊기 전에 담아 두는 곳. 아직 아무도 기록하지 않은 책도 담을 수 있다.
// 형태: 화면 높이 대부분을 덮는 바텀시트 — 검색창(키보드)과 결과 목록이 한 화면에 다 들어가야 하고,
//   여러 권을 연달아 담을 수 있게 담아도 닫지 않는다. 닫으면 책장을 새로 불러온다.

interface CatalogItem {
  title: string
  author: string
  publisher: string
  pubDate: string
  cover: string
  link: string
  isbn13: string
  isOutOfPrint: boolean
}

type Status = 'saving' | 'saved' | 'read' | 'error'

export default function WishAdd({
  savedKeys,
  readKeys,
}: {
  savedKeys: string[] // 이미 담은 책 (book_key)
  readKeys: string[] // 이미 기록한 책 (book_key) — 담을 수 없음
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="읽고 싶은 책 추가"
        className="-my-1 ml-auto flex h-9 w-9 items-center justify-center rounded-full text-main active:bg-main/10"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-main/40">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      {open && <WishAddSheet savedKeys={savedKeys} readKeys={readKeys} onClose={() => setOpen(false)} />}
    </>
  )
}

function WishAddSheet({
  savedKeys,
  readKeys,
  onClose,
}: {
  savedKeys: string[]
  readKeys: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  // 이번에 담은 책의 '추천이유' 메모 (2026.11.20) — 담은 줄 아래 칸. 선택 사항
  const [bookIds, setBookIds] = useState<Record<string, string>>({})
  const [memos, setMemos] = useState<Record<string, string>>({})
  const [memoState, setMemoState] = useState<Record<string, 'editing' | 'saving' | 'saved' | 'error'>>({})
  // 시트는 버튼을 누른 뒤(브라우저)에만 그려지므로 navigator·document를 바로 써도 된다
  const canScan = typeof navigator.mediaDevices?.getUserMedia === 'function'
  const [status, setStatus] = useState<Record<string, Status>>(() => {
    const init: Record<string, Status> = {}
    readKeys.forEach((k) => (init[k] = 'read'))
    savedKeys.forEach((k) => (init[k] = 'saved'))
    return init
  })
  const addedRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = () => {
    onClose()
    if (addedRef.current > 0) router.refresh() // 담은 책이 책장에 보이게
  }

  useEffect(() => {
    // 시트가 열려 있는 동안 뒤 화면이 스크롤되지 않게
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = async (keyword: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/search?query=${encodeURIComponent(keyword)}`)
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '검색에 실패했습니다.')
      setItems(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
      setItems([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  // 기록하기와 같은 방식 — 입력을 멈추고 0.3초 뒤 자동 검색, 한 글자 제목('점')도 검색
  useEffect(() => {
    const keyword = query.replace(/\s+/g, ' ').trim()
    if (!keyword) return // 비울 때의 초기화는 onChange에서
    const timer = setTimeout(() => search(keyword), 300)
    return () => clearTimeout(timer)
  }, [query])

  // 바코드 → ISBN 검색. 결과를 목록에 보여주고 '담기'는 사용자가 누른다(잘못 읽혔을 때 바로 확인)
  const handleBarcode = async (isbn: string) => {
    setScanOpen(false)
    setQuery('')
    await search(isbn)
  }

  const add = async (item: CatalogItem) => {
    const key = bookKeyOf(item)
    setStatus((s) => ({ ...s, [key]: 'saving' }))
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: item }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.alreadyRecorded) {
        setStatus((s) => ({ ...s, [key]: 'read' }))
        return
      }
      if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.')
      addedRef.current += 1
      if (data.bookId) setBookIds((m) => ({ ...m, [key]: data.bookId }))
      setStatus((s) => ({ ...s, [key]: 'saved' }))
    } catch {
      setStatus((s) => ({ ...s, [key]: 'error' }))
    }
  }

  const saveMemo = async (key: string) => {
    const bookId = bookIds[key]
    if (!bookId || !(memos[key] ?? '').trim()) return
    setMemoState((m) => ({ ...m, [key]: 'saving' }))
    try {
      await saveWishMemo(bookId, memos[key])
      addedRef.current += 1
      setMemoState((m) => ({ ...m, [key]: 'saved' }))
    } catch {
      setMemoState((m) => ({ ...m, [key]: 'error' }))
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="읽고 싶은 책 담기">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[92dvh] max-w-md flex-col rounded-t-3xl bg-bg shadow-lg">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <p className="text-sm font-semibold text-text">읽고 싶은 책 담기</p>
          <button type="button" onClick={close} className="-mr-2 px-2 py-1 text-sm text-text/50">
            닫기
          </button>
        </div>

        <div className="px-5">
          <div className="relative">
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (!e.target.value.trim()) {
                  setItems([])
                  setSearched(false)
                }
              }}
              placeholder="제목, 작가, ISBN으로 검색"
              autoComplete="off"
              enterKeyHint="search"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-12 text-sm outline-none focus:border-main"
            />
            {loading ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">검색 중…</span>
            ) : (
              canScan && (
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  aria-label="카메라로 바코드 찍어 찾기"
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-text/60"
                >
                  <CameraIcon />
                </button>
              )
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-safe">
          {!searched && !loading && (
            <p className="mt-8 text-center text-xs leading-relaxed text-text/40">
              어디선가 추천받은 책, 잊기 전에 담아 두세요.
              <br />
              아직 책육아 기록이 없는 책도 담을 수 있어요.
            </p>
          )}
          {searched && !loading && items.length === 0 && !error && (
            <p className="mt-8 text-center text-sm text-text/40">검색 결과가 없어요.</p>
          )}
          <ul className="divide-y divide-black/5">
            {items.map((item) => {
              const key = bookKeyOf(item)
              const st = status[key]
              return (
                <li key={key} className="py-2.5">
                  <div className="flex items-center gap-3">
                    <BookCover src={item.cover} title={item.title} size="sm" className="h-14 w-10 flex-shrink-0 rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-text">{item.title}</p>
                      <p className="truncate text-xs text-text/45">
                        {[item.author, item.publisher].filter(Boolean).join(' · ')}
                      </p>
                      {st === 'error' && <p className="text-xs text-red-500">담지 못했어요. 다시 눌러 주세요.</p>}
                    </div>
                    {st === 'read' ? (
                      <span className="flex-shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-xs text-text/40">읽은 책</span>
                    ) : st === 'saved' ? (
                      <span className="flex-shrink-0 rounded-full bg-main/10 px-3 py-1.5 text-xs font-medium text-main">담음 ✓</span>
                    ) : (
                      <button
                        type="button"
                        disabled={st === 'saving'}
                        onClick={() => add(item)}
                        className="flex-shrink-0 rounded-full border border-main/40 px-3 py-1.5 text-xs font-medium text-main disabled:opacity-50"
                      >
                        {st === 'saving' ? '담는 중…' : '담기'}
                      </button>
                    )}
                  </div>
                  {/* 담은 직후 — 추천받은 이유 메모(선택). 책 페이지 표지에 포스트잇으로 붙는다 */}
                  {st === 'saved' && bookIds[key] && (
                    <div className="ml-[52px] mt-2">
                      {memoState[key] === 'saved' ? (
                        <button
                          type="button"
                          onClick={() => setMemoState((m) => ({ ...m, [key]: 'editing' }))}
                          className="text-left text-xs text-text/60"
                        >
                          <span className="font-medium text-text/70">추천이유 :</span> {memos[key]}{' '}
                          <span className="text-text/35">· 고치기</span>
                        </button>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <input
                              value={memos[key] ?? ''}
                              onChange={(e) => setMemos((m) => ({ ...m, [key]: e.target.value.slice(0, WISH_MEMO_MAX) }))}
                              onKeyDown={(e) => e.key === 'Enter' && saveMemo(key)}
                              placeholder="추천받은 이유 (선택)"
                              enterKeyHint="done"
                              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-main"
                            />
                            <button
                              type="button"
                              disabled={!(memos[key] ?? '').trim() || memoState[key] === 'saving'}
                              onClick={() => saveMemo(key)}
                              className="rounded-lg bg-main px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                            >
                              {memoState[key] === 'saving' ? '저장 중' : '저장'}
                            </button>
                          </div>
                          {memoState[key] === 'error' && (
                            <p className="mt-1 text-xs text-red-500">메모를 저장하지 못했어요. 다시 눌러 주세요.</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {scanOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanOpen(false)} />}
    </div>,
    document.body
  )
}
