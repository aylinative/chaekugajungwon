'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { openLoginSheet, type LoginReason } from '@/components/auth/LoginSheet'

// 로그인이 필요한 탭 — 게스트가 누르면 페이지로 가지 않고 바로 로그인 시트 (2026.11.04, 페이지 열었다 튕기는 깜빡임 방지)
const LOGIN_TABS: Record<string, LoginReason> = { '/recommend/create': 'record', '/mypage': 'mypage' }

const TABS = [
  {
    href: '/',
    label: '홈',
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    ),
  },
  {
    href: '/recommend/create',
    label: '기록하기',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </>
    ),
  },
  {
    href: '/mypage',
    label: '마이',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
      </>
    ),
  },
]

export default function BottomTabBar() {
  const pathname = usePathname()
  // 로그인 여부: 브라우저에 저장된 세션으로 바로 확인(네트워크 없음). 확인 전(null)엔 막지 않는다 — 페이지 가드가 처리
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setLoggedIn(Boolean(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(Boolean(session)))
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <nav className="sticky bottom-0 z-30 mt-auto flex border-t border-black/5 bg-bg/95 backdrop-blur">
      {TABS.map((tab) => {
        const active =
          tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={(e) => {
              const reason = LOGIN_TABS[tab.href]
              if (reason && loggedIn === false) {
                e.preventDefault()
                openLoginSheet(reason, tab.href)
              }
            }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
              active ? 'text-main' : 'text-text/40'
            }`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {tab.icon}
            </svg>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
