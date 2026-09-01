'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

// 책육아 기록 달력 — 기록(재독 포함)을 날짜축으로. created_at은 UTC라 서버에서 KST 날짜 문자열로 변환해 전달.
// 날짜 셀: 그날 대표 표지 + '+N'(추가 기록 수). 탭 시 아래에 그날 기록 목록(→ /posts/[id]).
export interface CalendarRecord {
  id: string
  date: string // 'YYYY-MM-DD' (KST)
  cover: string | null
  title: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function ReadingCalendar({
  records,
  initialYear,
  initialMonth,
  todayStr,
  totalCount,
  yearCount,
}: {
  records: CalendarRecord[]
  initialYear: number
  initialMonth: number // 0-based
  todayStr: string
  totalCount: number // 총 기록 수(고정)
  yearCount: number // 올해 기록 수(고정)
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [selected, setSelected] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarRecord[]>()
    for (const r of records) {
      const arr = map.get(r.date)
      if (arr) arr.push(r)
      else map.set(r.date, [r])
    }
    return map
  }, [records])

  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay() // 0=일
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  // 보는 달의 기록 수 — 월 이동에 따라 갱신('이번달' 고정 문제 해소)
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const viewMonthCount = records.reduce((n, r) => (r.date.startsWith(monthPrefix) ? n + 1 : n), 0)

  const prevMonth = () => {
    setSelected(null)
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    setSelected(null)
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedRecords = selected ? byDate.get(selected) ?? [] : []

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="mb-3 px-1 text-sm font-semibold text-text">📖 책육아 기록 캘린더</h2>

      {/* 월 이동 */}
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prevMonth} aria-label="이전 달" className="px-3 py-1 text-text/50">
          ‹
        </button>
        <span className="text-sm font-semibold text-text">
          {year}년 {month + 1}월
        </span>
        <button type="button" onClick={nextMonth} aria-label="다음 달" className="px-3 py-1 text-text/50">
          ›
        </button>
      </div>

      {/* 요일 */}
      <div className="grid grid-cols-7 text-center text-[10px] text-text/40">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1">
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />
          const ds = ymd(year, month, day)
          const recs = byDate.get(ds)
          const rep = recs?.[0]
          const isToday = ds === todayStr
          const isSel = ds === selected
          return (
            <button
              key={ds}
              type="button"
              disabled={!recs}
              onClick={() => setSelected(isSel ? null : ds)}
              className={`relative flex aspect-square flex-col overflow-hidden rounded-md ${
                recs ? 'bg-surface-muted' : ''
              } ${isSel ? 'ring-2 ring-main' : ''}`}
            >
              {rep?.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rep.cover}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-90"
                />
              )}
              <span
                className={`relative z-10 m-0.5 self-start rounded px-1 text-[10px] leading-none ${
                  rep?.cover
                    ? 'bg-black/40 text-white'
                    : isToday
                      ? 'font-bold text-main'
                      : 'text-text/50'
                }`}
              >
                {day}
              </span>
              {recs && recs.length > 1 && (
                <span className="absolute bottom-0.5 right-0.5 z-10 rounded bg-black/55 px-1 text-[9px] leading-tight text-white">
                  +{recs.length - 1}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 선택한 날의 기록 목록 */}
      {selected && selectedRecords.length > 0 && (
        <div className="mt-3 border-t border-black/5 pt-3">
          <p className="mb-2 text-xs font-medium text-text/60">
            {selected.replace(/-/g, '.')} 기록 {selectedRecords.length}
          </p>
          <ul className="space-y-2">
            {selectedRecords.map((r) => (
              <li key={r.id}>
                <Link href={`/posts/${r.id}`} className="flex items-center gap-2">
                  <div className="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-surface-muted">
                    {r.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.cover} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="truncate text-sm text-text">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 기록 통계 — 총·올해는 고정, 이번 달은 보는 달 기준(월 이동 시 갱신) */}
      <div className="mt-3 border-t border-black/5 pt-2 text-center text-xs text-text/50">
        총 기록 {totalCount}개 · 올해 {yearCount}개 · 이번 달 {viewMonthCount}개
      </div>
    </section>
  )
}
