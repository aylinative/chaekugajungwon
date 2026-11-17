'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// 책 정보 제공처 변경 공지 띠 — 홈 상단, 시행 전(공지 기간)에만 (2026.11.17, 예스24 전환)
// 약관 '약관의 변경': 시행 7일 전부터 서비스 화면으로 알린다. 닫으면 이 기기에서는 다시 안 보임.
export default function BookSourceNotice({ startLabel }: { startLabel: string }) {
  const storageKey = `notice-book-source-${startLabel}`
  const [hidden, setHidden] = useState(true) // 저장 기록 확인 전엔 숨김(깜빡임 방지)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(storageKey) === '1'
    } catch {
      // 저장소를 못 쓰는 환경 — 그냥 보여 준다
    }
    if (!dismissed) setHidden(false) // eslint-disable-line react-hooks/set-state-in-effect -- 브라우저 저장소 확인 후 1회
  }, [storageKey])

  if (hidden) return null
  return (
    <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-text/70">
      <p className="flex-1 leading-relaxed">
        📢 {startLabel}부터 책 정보(표지·소개 등)를 <b>예스24</b>에서 받아 와요.{' '}
        <Link href="/terms" className="text-main underline underline-offset-2">
          약관 보기
        </Link>
      </p>
      <button
        type="button"
        aria-label="공지 닫기"
        onClick={() => {
          setHidden(true)
          try {
            localStorage.setItem(storageKey, '1')
          } catch {
            // 무시
          }
        }}
        className="-my-1 -mr-1 px-1.5 py-1 text-text/40"
      >
        ✕
      </button>
    </div>
  )
}
