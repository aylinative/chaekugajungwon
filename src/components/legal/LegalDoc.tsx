import Link from 'next/link'
import type { ReactNode } from 'react'

// 개인정보처리방침·이용약관 공용 레이아웃. 로그인 없이 누구나 볼 수 있다(스토어 심사·가입 전 확인용).
export interface LegalSection {
  title: string
  body: ReactNode
}

export default function LegalDoc({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string
  effectiveDate: string
  intro?: ReactNode
  sections: LegalSection[]
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-main">
          ‹ 홈
        </Link>
        <span className="flex-1 text-base font-semibold text-text">{title}</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-5 text-sm leading-relaxed text-text/80">
        <h1 className="text-lg font-bold text-text">{title}</h1>
        <p className="mt-1 text-xs text-text/50">시행일: {effectiveDate}</p>
        {intro && <div className="mt-4">{intro}</div>}

        <div className="mt-6 space-y-6">
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="mb-2 text-[15px] font-semibold text-text">
                {i + 1}. {s.title}
              </h2>
              <div className="space-y-2 [&_li]:ml-4 [&_li]:list-disc [&_table]:w-full [&_td]:border [&_td]:border-black/10 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_th]:border [&_th]:border-black/10 [&_th]:bg-surface-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 flex justify-center gap-3 text-xs text-text/40">
          <Link href="/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="underline underline-offset-2">
            이용약관
          </Link>
        </p>
      </main>
    </div>
  )
}
