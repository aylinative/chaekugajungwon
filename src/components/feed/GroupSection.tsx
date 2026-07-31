import Link from 'next/link'
import { RECOMMEND_GROUPS } from '@/lib/groups'
import PostCard from './PostCard'
import type { GroupSectionData } from '@/lib/feed'

const BADGE_BY_VALUE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.value, g.selectedClass])
)

const EMOJI_BY_VALUE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.value, g.emoji])
)

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.value, g.label])
)

// 그룹별 연령 설명 (한글)
const AGE_LABEL: Record<string, string> = {
  seed: '0~12개월',
  sprout: '12~18개월',
  springflower: '19~30개월',
  apple: '31개월~4살',
  tree: '5살 이상',
  adult: '어른도 함께',
}

export default function GroupSection({
  section,
  isLoggedIn,
}: {
  section: GroupSectionData
  isLoggedIn: boolean
}) {
  return (
    <section className="py-4">
      {/* 섹션 헤더 */}
      <div className="mb-3 flex items-end justify-between px-4">
        <div className="flex items-center gap-2">
          <span
            aria-label={LABEL_BY_VALUE[section.value] ?? section.label}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${
              BADGE_BY_VALUE[section.value] ?? 'bg-surface-muted'
            }`}
          >
            {EMOJI_BY_VALUE[section.value] ?? section.label}
          </span>
          <span className="text-xs text-text/50">{AGE_LABEL[section.value] ?? ''}</span>
        </div>
        {section.cards.length > 0 && (
          <Link href={`/group/${section.value}`} className="text-xs text-text/40">
            더보기 ›
          </Link>
        )}
      </div>

      {/* 카드 가로 스크롤 */}
      {section.cards.length === 0 ? (
        <p className="px-4 text-xs text-text/30">아직 추천이 없어요.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {section.cards.map((card) => (
            <PostCard key={card.id} card={card} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      )}
    </section>
  )
}
