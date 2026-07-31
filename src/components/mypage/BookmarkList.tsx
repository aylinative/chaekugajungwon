'use client'

import BookmarkButton from '@/components/BookmarkButton'

export interface BookmarkItem {
  bookId: string
  title: string
  author: string | null
  cover: string | null
  bookmarkCount: number
}

// 마이페이지 '아이와 함께 읽고 싶은 책' 리스트.
// 저장 해제해도 행은 그대로 남긴다(실수 방지 — 다시 눌러 복구 가능).
// 목록에서 실제로 빠지는 건 새로고침(재조회) 시점.
export default function BookmarkList({ items }: { items: BookmarkItem[] }) {
  const list = items

  if (list.length === 0) {
    return (
      <div className="rounded-2xl bg-surface px-6 py-8 text-center shadow-sm">
        <p className="text-sm text-text/50">
          아직 저장한 책이 없어요. 마음에 드는 책을 저장해 두세요.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {list.map((b) => (
        <li key={b.bookId}>
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm">
            <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
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
            </div>
            <BookmarkButton
              bookId={b.bookId}
              initialBookmarked
              initialCount={b.bookmarkCount}
              isLoggedIn
              variant="card"
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
