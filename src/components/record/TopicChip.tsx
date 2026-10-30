// 기록하기 주제 칩 — 고르는 곳이라 '#' 없음.
// 2026.10.28 운영자: 선택 색은 '기록 남기기' 버튼과 같은 올리브(bg-main), 높이 36px,
// 세부 칩도 한 줄 '하늘·우주 › 구름' (두 줄은 칩이 뚱뚱해 보여서 풀음)
interface Props {
  topic: string
  detail?: string | null
  selected: boolean
  onClick: () => void
  variant?: 'solid' | 'dashed' // dashed = 다른 양육자 줄 (+ 표시)
  ariaLabel?: string
}

export default function TopicChip({ topic, detail, selected, onClick, variant = 'solid', ariaLabel }: Props) {
  const base = 'flex h-9 flex-shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[13px]'
  const look =
    variant === 'dashed'
      ? 'border border-dashed border-text/30 text-text/70'
      : selected
        ? 'bg-main font-medium text-white'
        : 'bg-surface-muted text-text/75'
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} aria-label={ariaLabel} className={`${base} ${look}`}>
      {variant === 'dashed' && '+ '}
      {detail ? (
        <>
          <span className={selected ? 'text-white/75' : 'text-text/50'}>{topic} ›</span>
          <span className="ml-1 font-semibold">{detail}</span>
        </>
      ) : (
        topic
      )}
    </button>
  )
}
