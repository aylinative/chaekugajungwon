'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface SearchItem {
  bookId: string
  isbn: string
  title: string
  author: string | null
  cover: string | null
  recordCount: number
  recommendCount: number
}

// 검색 화면 (12장): 책 제목 → 해당 책의 기록(책 페이지)으로 연결.
// 기록 폼 검색과 동일한 UX 문법: 300ms 디바운스 자동 검색.
export default function SearchClient() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false) // 검색을 한 번이라도 수행했는지
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const keyword = query.replace(/\s+/g, ' ').trim()
    if (!keyword) {
      setItems([])
      setSearched(false)
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`)
        const data = await res.json()
        setItems(data.items ?? [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="책 제목으로 기록 찾기"
        autoComplete="off"
        className="w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm outline-none focus:border-main"
      />

      {/* 초기 상태 안내 */}
      {!searched && !loading && query.trim() === '' && (
        <p className="mt-10 text-center text-sm text-text/40">
          다른 양육자들의 책육아 기록을
          <br />책 제목으로 찾아보세요
        </p>
      )}

      {loading && <p className="mt-6 text-center text-xs text-text/40">검색 중…</p>}

      {/* 결과 리스트 → 책 페이지 */}
      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((b) => (
            <li key={b.bookId}>
              <Link
                href={`/book/${encodeURIComponent(b.isbn)}`}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm"
              >
                <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {b.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.cover}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      📖
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-text">{b.title}</p>
                  {b.author && (
                    <p className="mt-0.5 truncate text-xs text-text/50">{b.author}</p>
                  )}
                  <p className="mt-1 text-xs text-text/40">
                    기록 {b.recordCount} · 추천 {b.recommendCount}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 결과 없음 → 첫 기록 유도 (검색 실패를 기록 기회로 전환) */}
      {searched && !loading && items.length === 0 && query.trim() !== '' && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">🌱</span>
          <p className="text-sm text-text/60">
            &lsquo;{query.trim()}&rsquo;에 대한 기록이 아직 없어요.
          </p>
          <Link
            href="/recommend/create"
            className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white"
          >
            이 책의 첫 기록을 남겨보세요
          </Link>
        </div>
      )}
    </div>
  )
}
