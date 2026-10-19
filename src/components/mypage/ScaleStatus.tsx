import {
  FEED_CACHE_LIMIT,
  GROUP_PAGE_BOOK_LIMIT,
  type FeedScale,
} from '@/lib/feed'

// 운영자 전용 '서비스 규모' 상태 — 성능 구조 전환이 필요해지기 전에 미리 알려주는 신호.
// 70% 이상 노랑, 90% 이상 빨강. 기준·전환 방법은 CLAUDE.md Deferred TODO [성능 단계 2] 참고.
const WARN = 0.7
const DANGER = 0.9

function formatSize(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

export default function ScaleStatus({ scale }: { scale: FeedScale | null }) {
  if (!scale) {
    return (
      <section className="rounded-2xl bg-surface p-4 text-xs text-text/50 shadow-sm">
        서비스 규모를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.
      </section>
    )
  }

  const cacheRatio = scale.cacheSize / FEED_CACHE_LIMIT
  const groupRatio = scale.largestGroup.books / GROUP_PAGE_BOOK_LIMIT
  const worst = Math.max(cacheRatio, groupRatio)

  const status =
    worst >= DANGER
      ? { badge: '🔴 전환 작업 필요', tone: 'bg-red-50 text-red-600' }
      : worst >= WARN
        ? { badge: '🟡 곧 전환 필요', tone: 'bg-amber-50 text-amber-700' }
        : { badge: '🟢 여유 있음', tone: 'bg-main/10 text-main' }

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">서비스 규모 (운영자)</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.tone}`}>
          {status.badge}
        </span>
      </div>
      <ul className="space-y-1 text-xs text-text/70">
        <li>피드 책 {scale.feedBooks.toLocaleString()}권</li>
        <li>
          피드 캐시 {formatSize(scale.cacheSize)} / {formatSize(FEED_CACHE_LIMIT)} ({pct(cacheRatio)})
        </li>
        <li>
          가장 큰 시기({scale.largestGroup.label}) {scale.largestGroup.books.toLocaleString()}권 /{' '}
          {GROUP_PAGE_BOOK_LIMIT.toLocaleString()}권 ({pct(groupRatio)})
        </li>
      </ul>
      {worst >= WARN && (
        <p className="mt-2 text-[11px] leading-relaxed text-text/60">
          Claude에게 &ldquo;규모 경고 떴어&rdquo;라고 알려주세요. 홈·그룹 더보기를 DB에서 바로 뽑는
          방식으로 전환할 때예요.
        </p>
      )}
    </section>
  )
}
