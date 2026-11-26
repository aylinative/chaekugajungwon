'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isInAppBrowser } from '@/lib/inAppBrowser'

// 앱 안내 띠 배너 (2026.11.27 운영자) — 페이지 맨 위 한 줄, 스크롤하면 위로 사라짐(상단 헤더는 sticky라 그대로).
// 아이폰 사파리는 애플 스마트 앱 배너(layout itunes appId)가 따로 떠서 여기서는 안 띄운다.
// 띄우는 곳: 아이폰의 앱 안 브라우저(네이버·카톡·인스타·스레드 등)·크롬 등 사파리 외 브라우저,
//           안드로이드(ANDROID_STORE_URL이 있을 때만). PC·우리 앱 안·홈 화면 추가(PWA)에선 안 띄움.
// 버튼은 스토어로 — 웹에서는 앱 설치 여부를 알 수 없고, 스토어가 설치돼 있으면 '열기', 아니면 '받기'를 보여준다.

const IOS_STORE_URL = 'https://apps.apple.com/kr/app/id6830438312'
// ⚠️ 안드로이드 정식 출시(프로덕션) 후 채울 것: 'https://play.google.com/store/apps/details?id=kr.co.bookgardening.app'
const ANDROID_STORE_URL: string | null = null

const DISMISS_KEY = 'appBannerDismissedAt'
const DISMISS_DAYS = 14
// 쓰는 중이거나 로그인 흐름인 화면에선 띄우지 않는다
const HIDDEN_PATHS = ['/recommend/create', '/onboarding', '/auth']

function storeUrlFor(ua: string): string | null {
  if (/BookgardeningApp/.test(ua)) return null
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|Whale|YaBrowser|DuckDuckGo/i.test(ua)
    // 진짜 사파리 UA는 'Version/… Mobile/… Safari/…' — Safari/만 붙인 앱 안 브라우저를 사파리로 오인하지 않게 Version/까지 확인
    const isSafari = /Version\/[\d.]+.*Safari\//.test(ua) && !otherBrowser && !isInAppBrowser(ua)
    return isSafari ? null : IOS_STORE_URL
  }
  if (/Android/i.test(ua)) return ANDROID_STORE_URL
  return null
}

export default function AppBanner() {
  const pathname = usePathname()
  const [storeUrl, setStoreUrl] = useState<string | null>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY))
      if (at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000) return
    } catch {
      // 저장소를 못 쓰면 닫기 기억 없이 표시
    }
    // 브라우저 정보는 마운트 후에만 알 수 있음(서버·첫 렌더는 null로 같게 — 하이드레이션 안전)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoreUrl(storeUrlFor(navigator.userAgent))
  }, [])

  if (!storeUrl || HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null

  const dismiss = () => {
    setStoreUrl(null)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // 무시 — 이번 방문에서만 닫힘
    }
  }

  return (
    <div className="flex items-center gap-2.5 border-b border-black/5 bg-surface px-3 py-2">
      <button
        type="button"
        onClick={dismiss}
        aria-label="앱 안내 닫기"
        className="-ml-1 flex h-7 w-7 shrink-0 items-center justify-center text-text/40"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold">책육아정원 앱</p>
        <p className="truncate text-xs text-text/60">앱에서 더 편하게 기록해요</p>
      </div>
      <a
        href={storeUrl}
        className="shrink-0 rounded-full border border-main/40 px-3 py-1 text-xs font-medium text-main"
      >
        앱 보기
      </a>
    </div>
  )
}
