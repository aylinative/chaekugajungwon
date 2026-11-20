import Link from 'next/link'
import { RECOMMEND_GROUPS, LABEL_TO_EMOJI } from '@/lib/groups'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import type { BookCard } from '@/lib/feedShared'
import { saveBookNav, bookNavHref } from '@/lib/bookNav'

// 홈 피드 카드 = 책 1권 (기록 집계). 탭 시 /book/[isbn]으로 이동.
// 정보 우선순위: 대표 아이 반응 > 시기·주제.
// 기록 수·추천 수·저장 버튼은 두지 않는다(2026.11.20 운영자) — 추천순 정렬이 이미 반영하고, 책 페이지에 다 있으며,
// 이용자가 적은 지금 '1, 2' 같은 작은 숫자가 서비스가 한산하다는 인상을 준다.
// 글밥량은 책 페이지에서 확인 (홈에서는 미표시 — 정보 과밀 방지).

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)

export default function BookCardItem({
  card,
  fullWidth = false,
  showBoardBook = false,
  navIsbns,
}: {
  card: BookCard
  fullWidth?: boolean // true=그리드 셀 꽉 채움(전체보기) / false=가로 스크롤 고정폭(홈)
  showBoardBook?: boolean // 씨앗·새싹 섹션에서만 보드북 배지 노출(0~18M에 유용한 물성)
  navIsbns?: string[] // 이 카드가 속한 목록(보이는 순서) — 있으면 책 페이지에서 좌우로 넘기기 (lib/bookNav)
}) {
  return (
    <Link
      href={navIsbns ? bookNavHref(card.isbn) : `/book/${encodeURIComponent(card.isbn)}`}
      onClick={navIsbns ? () => saveBookNav(navIsbns) : undefined}
      className={`flex flex-col gap-2 ${fullWidth ? 'w-full' : 'w-28 flex-shrink-0'}`}
    >
      {/* 표지 */}
      {/* 눌림 효과(표지에만) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-surface-muted shadow-sm transition duration-100 active:scale-[0.96] active:opacity-80">
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
        {/* 보드북 배지 — 씨앗·새싹 섹션에서만(0~18M 물성 정보). 표지 위 오버레이 */}
        {showBoardBook && card.isBoardBook && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-main/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
            보드북
          </span>
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

      {/* 시기 배지 (합집합) — 카드 높이 유지 위해 한 줄(최대 3개) + 나머지는 +N */}
      <div className="flex flex-wrap items-center gap-1">
        {card.groups.slice(0, 3).map((g) => (
          <span
            key={g}
            aria-label={g}
            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
              LABEL_TO_BADGE[g] ?? 'bg-surface-muted'
            }`}
          >
            {LABEL_TO_EMOJI[g] ?? g}
          </span>
        ))}
        {card.groups.length > 3 && (
          <span className="text-[10px] text-text/40">+{card.groups.length - 3}</span>
        )}
      </div>

      {/* 주제 태그 (최대 2 + 나머지 +N) — 없어도 자리 예약(주제 유무로 정렬이 어긋나지 않게) */}
      <div className="min-h-[1rem]">
        {card.topics.length > 0 && (
          <p className="line-clamp-1 text-[11px] text-text/50">
            {card.topics.slice(0, 2).map((t) => `#${t}`).join(' ')}
            {card.topics.length > 2 && (
              <span className="text-text/40"> +{card.topics.length - 2}</span>
            )}
          </p>
        )}
      </div>

    </Link>
  )
}
