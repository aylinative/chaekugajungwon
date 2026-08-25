'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import BookCover from '@/components/BookCover'
import { FEEDBACK_FORM_URL } from '@/lib/feedback'

interface SearchItem {
  bookId: string
  isbn: string
  title: string
  author: string | null
  cover: string | null
  recordCount: number
  recommendCount: number
}

interface CatalogItem {
  title: string
  author: string
  cover: string
  isbn13: string
}

// 검색 화면 (12장): 두 섹션 구조.
// ① 책육아 기록이 있는 책 (우리 DB) → /book/[isbn]
// ② 아직 기록이 없는 책 (카카오 검색) → '첫 기록 남기기'로 기록 유도.
//    기록이 없으면 "없는 책"임이 명확히 인식되도록 섹션을 분리해 라벨링한다.
export default function SearchClient() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
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
      setCatalogItems([])
      setSearched(false)
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // 우리 기록 + 카카오을 병렬 검색. 한쪽 실패해도 다른 쪽은 표시.
        const [minePayload, catalogPayload] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(keyword)}`)
            .then((r) => r.json())
            .catch(() => ({ items: [] })),
          fetch(`/api/books/search?query=${encodeURIComponent(keyword)}`)
            .then((r) => r.json())
            .catch(() => ({ items: [] })),
        ])
        const mine: SearchItem[] = minePayload.items ?? []
        setItems(mine)
        // 이미 기록이 있는 책(isbn 일치)은 카카오 섹션에서 제외
        const knownIsbns = new Set(mine.map((m) => m.isbn))
        setCatalogItems(
          ((catalogPayload.items ?? []) as CatalogItem[])
            .filter((a) => a.isbn13 && !knownIsbns.has(a.isbn13))
            .slice(0, 10)
        )
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const trimmed = query.trim()

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
      {!searched && !loading && trimmed === '' && (
        <p className="mt-10 text-center text-sm text-text/40">
          다른 양육자들의 책육아 기록을
          <br />책 제목으로 찾아보세요
        </p>
      )}

      {loading && <p className="mt-6 text-center text-xs text-text/40">검색 중…</p>}

      {searched && !loading && (
        <>
          {/* ① 책육아 기록이 있는 책 → 책 페이지 */}
          <section className="mt-4">
            <h2 className="mb-2 px-1 text-sm font-semibold text-text">
              책육아 기록이 있는 책
            </h2>
            {items.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-text/50">
                &lsquo;{trimmed}&rsquo;의 책육아 기록이 아직 없어요
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((b) => (
                  <li key={b.bookId}>
                    <Link
                      href={`/book/${encodeURIComponent(b.isbn)}`}
                      className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm"
                    >
                      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                        <BookCover src={b.cover} title={b.title} size="md" className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-text">
                          {b.title}
                        </p>
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
          </section>

          {/* ② 아직 기록이 없는 책 (카카오) → 첫 기록 유도 */}
          {catalogItems.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-1 px-1 text-sm font-semibold text-text">
                아직 기록이 없는 책
              </h2>
              <p className="mb-2 px-1 text-xs text-text/40">
                이 책을 읽어보셨다면 첫 기록을 남겨주세요
              </p>
              <ul className="space-y-2">
                {catalogItems.map((a) => (
                  <li key={a.isbn13}>
                    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-text/15 bg-surface/60 p-3">
                      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted opacity-80">
                        <BookCover src={a.cover} title={a.title} size="md" className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-text/80">
                          {a.title}
                        </p>
                        {a.author && (
                          <p className="mt-0.5 truncate text-xs text-text/40">{a.author}</p>
                        )}
                        <p className="mt-1 text-xs text-text/35">책육아 기록 없음</p>
                      </div>
                      <Link
                        href={`/recommend/create?query=${encodeURIComponent(a.title)}`}
                        className="flex-shrink-0 rounded-full bg-main px-3 py-1.5 text-xs font-medium text-white"
                      >
                        첫 기록 남기기
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 양쪽 다 없을 때 */}
          {items.length === 0 && catalogItems.length === 0 && (
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <span className="text-3xl">🌱</span>
              <p className="text-sm text-text/60">검색 결과가 없어요.</p>
              <Link
                href="/recommend/create"
                className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white"
              >
                직접 기록 남기러 가기
              </Link>
            </div>
          )}

          {/* 못 찾은 책은 제보 유도 (구글폼) — 데드엔드 방지 + '없는 책' 데이터 수집 */}
          <p className="mt-6 text-center text-xs text-text/40">
            찾는 책이 없나요?{' '}
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-main underline underline-offset-2"
            >
              알려주기
            </a>
          </p>
        </>
      )}
    </div>
  )
}
