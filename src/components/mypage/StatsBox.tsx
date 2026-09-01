// 책육아 통계 — 기록 수(재독 포함) 3구간. 책장(distinct 책 수)과 분업.
// 값은 서버(page.tsx)에서 KST 기준으로 집계해 전달(순수 표시 컴포넌트).
interface StatsBoxProps {
  total: number
  thisMonth: number
  thisWeek: number
}

export default function StatsBox({ total, thisMonth, thisWeek }: StatsBoxProps) {
  const cells: { label: string; value: number }[] = [
    { label: '지금까지', value: total },
    { label: '이번 달', value: thisMonth },
    { label: '이번 주', value: thisWeek },
  ]
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="mb-3 px-1 text-sm font-semibold text-text">📖 책육아 기록</h2>
      <div className="grid grid-cols-3 divide-x divide-black/5">
        {cells.map((c) => (
          <div key={c.label} className="flex flex-col items-center gap-0.5 px-2">
            <span className="text-2xl font-bold text-main">{c.value}</span>
            <span className="text-xs text-text/50">{c.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
