import Link from 'next/link'
import { RECOMMEND_GROUPS, sortGroupLabelsByAge } from '@/lib/groups'
import { REACTION_BY_VALUE } from '@/lib/reactions'
import { formatYmd } from '@/lib/date'
import { readOrderLabel } from '@/lib/readOrder'
import HidePostButton from '@/components/post/HidePostButton'
import PostPhotos from '@/components/post/PostPhotos'
import ReportBlockActions from '@/components/report/ReportBlockActions'
import BlockedCover from '@/components/report/BlockedCover'

// 책 페이지·책육아 기록 전체 보기(/book/[isbn]/records) 공용 기록 카드.
// 기록 카드 = 양육자의 평가 전용 (반응·시기·일기). 글밥량·추천은 책 정보 영역에 (2026.08).
// full=true(전체 보기): 일기 전체 + 참고사진 썸네일(누르면 크게). false(책 페이지): 일기 3줄, 사진 없음.

const LABEL_TO_BADGE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.selectedClass])
)
const LABEL_TO_EMOJI: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.emoji])
)

export interface RecordCardPost {
  id: string
  user_id: string
  child_reaction: number
  content: string | null
  created_at: string
  diary_date?: string | null // 책육아 일기 날짜(있으면 이걸 표시)
  author: { nickname: string | null } | null
  post_groups: { group_name: string }[] | null
  post_images?: { image_url: string; sort_order: number }[] | null
}

export default function RecordCard({
  post: p,
  viewerId,
  blocked,
  from,
  full = false,
  order,
  as = 'li',
}: {
  post: RecordCardPost
  viewerId: string | null
  blocked: boolean // 내가 차단한 사람 — 자리는 남기고 내용 대신 커버(기록 수와 카드 수가 맞게)
  from: string // 차단 해제 후 돌아올 화면
  full?: boolean
  order?: number // 같은 책 재독 순번(lib/readOrder) — 2 이상이면 날짜 위에 'N번째'
  as?: 'li' | 'div' // 재독 가로 줄(RecordSwipeRow) 안에서는 div
}) {
  const Wrap = as
  if (blocked) {
    return (
      <Wrap className="block overflow-hidden rounded-2xl bg-surface shadow-sm">
        <BlockedCover from={from} />
      </Wrap>
    )
  }
  const groups = sortGroupLabelsByAge((p.post_groups ?? []).map((g) => g.group_name))
  const reaction = REACTION_BY_VALUE[p.child_reaction]
  const photos = full
    ? [...(p.post_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_url)
    : []

  const orderLabel = readOrderLabel(order)
  return (
    <Wrap className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface shadow-sm">
      <Link href={`/posts/${p.id}`} className="block flex-1 p-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-main/10 text-xs">🌿</span>
            {p.author?.nickname ?? '익명'}
          </span>
          <span className="ml-auto flex flex-col items-end text-xs leading-tight text-text/40">
            {orderLabel && <span className="text-[10px] text-text/45">{orderLabel}</span>}
            {formatYmd(p.diary_date ?? p.created_at)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {groups.map((g) => (
            <span
              key={g}
              aria-label={g}
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                LABEL_TO_BADGE[g] ?? 'bg-surface-muted'
              }`}
            >
              {LABEL_TO_EMOJI[g] ?? g}
            </span>
          ))}
          {reaction && (
            <span className="text-[11px] font-medium text-point">
              {reaction.emoji} {reaction.label}
            </span>
          )}
        </div>

        {p.content && (
          <p
            className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text/80 ${
              full ? '' : 'line-clamp-3'
            }`}
          >
            {p.content}
          </p>
        )}
      </Link>

      {/* 참고사진 — 링크 밖에 둬서 누르면 상세로 가지 않고 크게 보기 */}
      {photos.length > 0 && (
        <div className="px-4 pb-4">
          <PostPhotos urls={photos} />
        </div>
      )}

      {/* 남의 기록: 신고·차단 (로그인한 경우) */}
      {viewerId && viewerId !== p.user_id && (
        <div className="flex justify-end gap-3 border-t border-black/5 px-4 py-1.5">
          <ReportBlockActions postId={p.id} authorId={p.user_id} authorNickname={p.author?.nickname ?? null} />
        </div>
      )}
      {/* 작성자 본인에게만 수정/삭제 (삭제는 소프트, stay=그 자리 새로고침) */}
      {viewerId === p.user_id && (
        <div className="flex justify-end gap-3 border-t border-black/5 px-4 py-1.5">
          <Link href={`/recommend/create?edit=${p.id}`} className="text-xs text-text/40">
            수정
          </Link>
          <HidePostButton
            postId={p.id}
            label="삭제"
            confirmText="이 기록을 삭제할까요? 목록에서 보이지 않게 됩니다."
            stay
          />
        </div>
      )}
    </Wrap>
  )
}
