import Link from 'next/link'
import { RECOMMEND_GROUPS, LABEL_TO_EMOJI } from '@/lib/groups'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import { BOOKMARK_COUNT_MIN_DISPLAY } from '@/lib/constants'
import BookmarkButton from '@/components/BookmarkButton'
import { ThumbIcon } from '@/components/RecommendButton'
import type { BookCard } from '@/lib/feed'

// 홈 피드 카드 = 책 1권 (기록 집계). 탭 시 /book/[isbn]으로 이동.
// 추천(👍)은 표시 전용 — 추천 행위는 책 페이지의 기록 카드·상세에서 한다.
// 정보 우선순위: 대표 아이 반응 > 기록 수·주제 > 추천 수·저장.
// 글밥량은 책 페이지에서 확인 (홈에서는 미표시 — 정보 과밀 방지).

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)

// 기록 수 아이콘 (문서) — '기록 N' 텍스트 대신 아이콘으로 통일
function RecordIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  )
}

export default function BookCardItem({
  card,
  isLoggedIn,
  fullWidth = false,
}: {
  card: BookCard
  isLoggedIn: boolean
  fullWidth?: boolean // true=그리드 셀 꽉 채움(전체보기) / false=가로 스크롤 고정폭(홈)
}) {
  return (
    <Link
      href={`/book/${encodeURIComponent(card.isbn)}`}
      className={`flex flex-col gap-2 ${fullWidth ? 'w-full' : 'w-36 flex-shrink-0'}`}
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

      {/* 제목 — 항상 2줄 높이 예약(1줄이어도 자리 유지)해 카드 간 정렬을 맞춤 */}
      <p className="line-clamp-2 min-h-[2.4rem] text-sm font-medium leading-snug text-text">
        {card.title}
      </p>

      {/* 대표 반응 (최빈) — 없어도 자리 예약 */}
      <div className="min-h-[1.1rem]">
        {REACTION_BY_VALUE[card.reaction] && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-point">
            <span className="text-sm leading-none">
              {REACTION_BY_VALUE[card.reaction].emoji}
            </span>
            {REACTION_BY_VALUE[card.reaction].label}
          </p>
        )}
      </div>

      {/* 시기 배지 (합집합, 최대 2) */}
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

      {/* 주제 태그 (최대 2) — 없어도 자리 예약(주제 유무로 정렬이 어긋나지 않게) */}
      <div className="min-h-[1rem]">
        {card.topics.length > 0 && (
          <p className="line-clamp-1 text-[11px] text-text/50">
            {card.topics.slice(0, 2).map((t) => `#${t}`).join(' ')}
          </p>
        )}
      </div>

      {/* 기록 수 + 추천 수(표시 전용) + 저장 — 모두 아이콘 */}
      <div className="flex items-center justify-end gap-2 text-xs text-text/40">
        <span className="flex items-center gap-0.5" aria-label={`기록 ${card.recordCount}`}>
          <RecordIcon size={12} />
          {card.recordCount}
        </span>
        <span className="flex items-center gap-0.5" aria-label={`추천 ${card.recommendUserCount}`}>
          <ThumbIcon filled={false} size={13} />
          {card.recommendUserCount}
        </span>
        <BookmarkButton
          bookId={card.bookId}
          initialBookmarked={card.bookmarkedByMe}
          initialCount={card.bookmarkCount}
          isLoggedIn={isLoggedIn}
          variant="card"
        />
      </div>

      {/* 저장 수 — 임계치 미만이면 영역 자체를 렌더링하지 않음(0도 표시 금지) */}
      {card.bookmarkCount >= BOOKMARK_COUNT_MIN_DISPLAY && (
        <p className="text-[11px] text-text/40">{card.bookmarkCount}명이 담았어요</p>
      )}
    </Link>
  )
}
