import Link from 'next/link'
import { RECOMMEND_GROUPS, LABEL_TO_EMOJI } from '@/lib/groups'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import { BOOKMARK_COUNT_MIN_DISPLAY } from '@/lib/constants'
import BookmarkButton from '@/components/BookmarkButton'
import type { FeedCard } from '@/lib/feed'

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)

function DensityStars({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, value))
  return (
    <span className="text-xs tracking-tight text-point" aria-label={`글밥량 ${filled}단계`}>
      {'★'.repeat(filled)}
      <span className="text-text/20">{'☆'.repeat(5 - filled)}</span>
    </span>
  )
}

export default function PostCard({
  card,
  isLoggedIn,
}: {
  card: FeedCard
  isLoggedIn: boolean
}) {
  return (
    <Link
      href={`/posts/${card.id}`}
      className="flex w-36 flex-shrink-0 flex-col gap-2"
    >
      {/* 표지 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-surface-muted shadow-sm">
        {card.cover ? (
          // 외부 이미지: next/image 도메인 설정 회피 위해 img 사용
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.cover}
            alt={card.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">📖</div>
        )}
      </div>

      {/* 제목 */}
      <p className="line-clamp-2 text-sm font-medium leading-snug text-text">
        {card.title}
      </p>

      {/* 우리 아이 반응 (이모지 + 짧은 라벨, 배경 없이) */}
      {REACTION_BY_VALUE[card.reaction] && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-point">
          <span className="text-sm leading-none">
            {REACTION_BY_VALUE[card.reaction].emoji}
          </span>
          {REACTION_BY_VALUE[card.reaction].label}
        </p>
      )}

      {/* 그룹 배지 */}
      <div className="flex flex-wrap gap-1">
        {card.groups.slice(0, 2).map((g) => (
          <span
            key={g}
            aria-label={g}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
              LABEL_TO_BADGE[g] ?? 'bg-surface-muted'
            }`}
          >
            {LABEL_TO_EMOJI[g] ?? g}
          </span>
        ))}
      </div>

      {/* 주제 태그 (최대 2) */}
      {card.topics.length > 0 && (
        <p className="line-clamp-1 text-[11px] text-text/50">
          {card.topics.slice(0, 2).map((t) => `#${t}`).join(' ')}
        </p>
      )}

      {/* 글밥량 + 좋아요 + 저장 */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span className="text-[10px] text-text/40">글밥량</span>
          <DensityStars value={card.density} />
        </span>
        <span className="flex items-center gap-1 text-xs text-text/50">
          <span className="flex items-center gap-0.5">
            <span className="text-point">♥</span>
            {card.likeCount}
          </span>
          {card.bookId && (
            <BookmarkButton
              bookId={card.bookId}
              initialBookmarked={card.bookmarkedByMe}
              initialCount={card.bookmarkCount}
              isLoggedIn={isLoggedIn}
              variant="card"
            />
          )}
        </span>
      </div>

      {/* 저장 수 — 임계치 미만이면 영역 자체를 렌더링하지 않음(0도 표시 금지) */}
      {card.bookmarkCount >= BOOKMARK_COUNT_MIN_DISPLAY && (
        <p className="text-[11px] text-text/40">{card.bookmarkCount}명이 담았어요</p>
      )}
    </Link>
  )
}
