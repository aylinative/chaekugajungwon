import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import BottomTabBar from '@/components/BottomTabBar'

export const metadata: Metadata = { title: '이용자 현황 | 책육아정원', robots: { index: false } }

// 운영자 전용: 가입자 수·신규 가입·첫 기록 완료율 (2026.11.03)
// 숫자만 보여주고 명단(닉네임)은 보여주지 않는다. 탈퇴한 계정은 DB에서 지워지므로 자동 제외.
// 날짜는 한국 시간(KST) 기준.
const DAY = 24 * 60 * 60 * 1000
const KST = 9 * 60 * 60 * 1000
const kstDate = (iso: string) => new Date(new Date(iso).getTime() + KST).toISOString().slice(0, 10)
// n일 전의 한국 날짜 (0 = 오늘)
const kstDaysAgo = (n: number) => kstDate(new Date(Date.now() - n * DAY).toISOString())
const PAGE = 1000
const RECENT_DAYS = 14

// API 1,000행 제한 — 끝까지 나눠 받기
async function fetchAll<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await load(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

export default async function AdminUsersPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !(await getIsOperator(supabase, user.id))) redirect('/')

  const [users, posts] = await Promise.all([
    fetchAll<{ id: string; created_at: string }>((from, to) =>
      supabase.from('users').select('id, created_at').order('created_at', { ascending: true }).range(from, to),
    ),
    // 첫 기록 완료 판단 — 나중에 지운(숨긴) 기록도 '기록을 남긴 적 있음'으로 센다
    fetchAll<{ user_id: string }>((from, to) =>
      supabase.from('posts').select('user_id').order('id', { ascending: true }).range(from, to),
    ),
  ])

  const writers = new Set(posts.map((p) => p.user_id))
  const today = kstDaysAgo(0)
  const daysAgo = kstDaysAgo

  const signupDay = users.map((u) => ({ day: kstDate(u.created_at), wrote: writers.has(u.id) }))
  const since = (n: number) => signupDay.filter((u) => u.day > daysAgo(n))
  const total = signupDay.length
  const todayCount = signupDay.filter((u) => u.day === today).length
  const last7 = since(7)
  const last30 = since(30)
  const wroteAll = signupDay.filter((u) => u.wrote).length
  const wrote30 = last30.filter((u) => u.wrote).length

  const daily = Array.from({ length: RECENT_DAYS }, (_, i) => {
    const day = daysAgo(i)
    const rows = signupDay.filter((u) => u.day === day)
    return { day, count: rows.length, wrote: rows.filter((u) => u.wrote).length }
  })
  const maxDaily = Math.max(1, ...daily.map((d) => d.count))
  const pct = (a: number, b: number) => (b === 0 ? '-' : `${Math.round((a / b) * 100)}%`)

  const cards = [
    { label: '전체 가입자', value: total },
    { label: '오늘 신규', value: todayCount },
    { label: '최근 7일 신규', value: last7.length },
    { label: '최근 30일 신규', value: last30.length },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="flex-1 text-base font-semibold text-text">이용자 현황</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pb-24 pt-4">
        <section className="grid grid-cols-2 gap-2">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl bg-surface px-4 py-3 shadow-sm">
              <p className="text-xs text-text/50">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {c.value}
                <span className="ml-0.5 text-sm font-normal text-text/50">명</span>
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-surface px-4 py-3 shadow-sm">
          <h2 className="text-sm font-semibold text-text">가입 후 첫 기록 완료</h2>
          <dl className="mt-2 space-y-1 text-sm text-text/80">
            <div className="flex justify-between">
              <dt>전체 가입자</dt>
              <dd>
                {wroteAll} / {total}명 <span className="text-text/50">({pct(wroteAll, total)})</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>최근 30일 가입자</dt>
              <dd>
                {wrote30} / {last30.length}명 <span className="text-text/50">({pct(wrote30, last30.length)})</span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl bg-surface px-4 py-3 shadow-sm">
          <h2 className="text-sm font-semibold text-text">일별 신규 가입 (최근 {RECENT_DAYS}일)</h2>
          <p className="mt-0.5 text-[11px] text-text/45">진한 막대 = 그날 가입해 기록까지 남긴 사람</p>
          <ul className="mt-3 space-y-1.5">
            {daily.map((d) => (
              <li key={d.day} className="flex items-center gap-2 text-xs">
                <span className="w-11 flex-shrink-0 text-text/55">{d.day.slice(5).replace('-', '.')}</span>
                <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-text/[0.06]">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-main/30" style={{ width: `${(d.count / maxDaily) * 100}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-main" style={{ width: `${(d.wrote / maxDaily) * 100}%` }} />
                </span>
                <span className="w-14 flex-shrink-0 text-right text-text/70">
                  {d.count}명{d.count > 0 && <span className="text-text/40"> ({d.wrote})</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="px-1 text-[11px] text-text/40">탈퇴한 계정은 집계에서 빠져요. 운영자·테스트 계정도 포함된 숫자예요.</p>
      </main>
      <BottomTabBar />
    </div>
  )
}
