'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSwipe } from '@/lib/useSwipe'
import { BOOK_NAV_PARAM, bookNavHref, readBookNav } from '@/lib/bookNav'

// 책 정보 카드를 좌우로 밀어 같은 목록(홈 시기 섹션·시기 더보기에서 보던 순서)의 이전/다음 책으로 (2026.11.14).
// 카드 안에서만 받는다(화면 전체 X — 위아래 스크롤·아이폰 뒤로 가기와 안 부딪히게). 줄을 따로 두지 않고
// 카드 양옆의 옅은 ‹ ›로만 넘길 수 있음을 알린다. 이동은 replace — 뒤로 가기는 넘기기 전 화면(홈 등)으로 바로.
export default function BookSwipeNav({ isbn, children }: { isbn: string; children: React.ReactNode }) {
  const router = useRouter()
  const enabled = useSearchParams().get(BOOK_NAV_PARAM) === '1'
  const [list, setList] = useState<string[] | null>(null)

  useEffect(() => {
    // sessionStorage는 브라우저에서만 읽을 수 있어 화면이 뜬 뒤 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) setList(readBookNav())
  }, [enabled])

  const idx = list ? list.indexOf(isbn) : -1
  const prevIsbn = idx > 0 ? list![idx - 1] : null
  const nextIsbn = idx >= 0 && idx < list!.length - 1 ? list![idx + 1] : null

  useEffect(() => {
    if (prevIsbn) router.prefetch(bookNavHref(prevIsbn))
    if (nextIsbn) router.prefetch(bookNavHref(nextIsbn))
  }, [prevIsbn, nextIsbn, router])

  const go = (target: string | null) => {
    if (target) router.replace(bookNavHref(target))
  }
  const swipe = useSwipe({ onLeft: () => go(nextIsbn), onRight: () => go(prevIsbn) })

  if (idx < 0) return <>{children}</>

  const edge =
    'absolute top-1/2 z-10 flex h-10 w-5 -translate-y-1/2 items-center justify-center text-lg text-text/25'
  return (
    <div className="relative" {...swipe}>
      {children}
      {prevIsbn && (
        <button type="button" onClick={() => go(prevIsbn)} aria-label="이전 책" className={`${edge} -left-4`}>
          ‹
        </button>
      )}
      {nextIsbn && (
        <button type="button" onClick={() => go(nextIsbn)} aria-label="다음 책" className={`${edge} -right-4`}>
          ›
        </button>
      )}
    </div>
  )
}
