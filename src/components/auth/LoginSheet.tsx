'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { appleFinishUrl, oauthLoginUrl, safeNext } from '@/lib/loginNext'
import {
  AUTH_PROVIDER_LABEL,
  canUseGoogleLogin,
  isAuthProvider,
  LAST_LOGIN_COOKIE,
  type AuthProvider,
} from '@/lib/authProvider'
import { appleNativeAuth, isAppleCancel, isAppleLoginAvailable } from '@/lib/nativeApple'
import { externalBrowserUrl, isInAppBrowser } from '@/lib/inAppBrowser'

// 로그인 바텀시트 (2026.11.04 — 둘러보기는 로그인 없이, 계정이 필요한 행동을 할 때만 로그인)
// 어디서든 openLoginSheet('bookmark')로 연다. layout에 LoginSheetHost가 하나 있다.
// 로그인 후에는 지금 보던 화면으로 돌아온다(next). 약관 동의 문구는 여기 두지 않고 가입 화면(/onboarding)에 — 로그인≠가입
// 수단: 카카오=모든 곳 / 구글=모든 브라우저(앱 안 브라우저는 기본 브라우저로 넘겨서)·Android 앱 / Apple=iOS 앱 (docs/app-store/STORE_STEPS.md STEP I3)
export type LoginReason = 'record' | 'recommend' | 'bookmark' | 'mypage' | 'child' | 'report' | 'default'

const COPY: Record<LoginReason, { title: string; sub: string }> = {
  record: { title: '기록을 남기려면 로그인이 필요해요', sub: '아이와 읽은 책을 기록하고 나만의 책육아 일기를 쌓아 보세요.' },
  recommend: { title: '추천하려면 로그인이 필요해요', sub: '아이와 읽어 보고 좋았던 책을 다른 양육자에게 추천해 주세요.' },
  bookmark: { title: '책을 저장하려면 로그인이 필요해요', sub: '나중에 아이와 읽고 싶은 책을 모아 둘 수 있어요.' },
  mypage: { title: '로그인하고 내 책장을 만들어 보세요', sub: '함께 읽은 책, 읽고 싶은 책, 책육아 캘린더를 볼 수 있어요.' },
  child: { title: '우리 아이 시기에 맞춰 보려면 로그인이 필요해요', sub: '아이 생일을 등록하면 지금 시기에 맞는 책을 먼저 보여 드려요.' },
  report: { title: '신고·차단하려면 로그인이 필요해요', sub: '불편한 기록을 알려 주시면 운영자가 확인해요.' },
  default: { title: '로그인이 필요해요', sub: '간편하게 시작할 수 있어요.' },
}

const EVENT = 'chaekugajungwon:open-login'

// next: 로그인 후 돌아갈 곳(생략하면 지금 화면)
export function openLoginSheet(reason: LoginReason = 'default', next?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason, next } }))
}

const REASONS = Object.keys(COPY) as LoginReason[]

// 로그인이 필요한 화면(기록하기·마이)에 주소로 바로 들어온 게스트 → 홈으로 보내며 /?login=record&next=/recommend/create
// 홈이 이 컴포넌트로 시트를 열고, 주소창의 login·next는 지운다(새로고침 때 다시 뜨지 않게)
export function LoginPromptFromUrl({ reason, next }: { reason?: string; next?: string }) {
  useEffect(() => {
    if (!reason) return
    const url = new URL(window.location.href)
    url.searchParams.delete('login')
    url.searchParams.delete('next')
    window.history.replaceState(null, '', url.pathname + url.search)
    // 한 박자 늦게 — 페이지의 effect가 layout의 LoginSheetHost(리스너 등록)보다 먼저 돌 수 있어서
    const timer = setTimeout(() =>
      openLoginSheet(REASONS.includes(reason as LoginReason) ? (reason as LoginReason) : 'default', safeNext(next) ?? undefined)
    )
    return () => clearTimeout(timer)
  }, [reason, next])
  return null
}

function readLastLogin(): AuthProvider | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LAST_LOGIN_COOKIE}=([^;]*)`))
  return match && isAuthProvider(match[1]) ? match[1] : null
}

const BUTTON = 'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl font-medium'

export function LoginSheetHost() {
  const [reason, setReason] = useState<LoginReason | null>(null)
  const [next, setNext] = useState('/')
  const [methods, setMethods] = useState({ google: false, apple: false, inApp: false })
  const [externalHint, setExternalHint] = useState(false)
  const [lastLogin, setLastLogin] = useState<AuthProvider | null>(null)
  const [appleBusy, setAppleBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ reason: LoginReason; next?: string }>).detail
      setNext(d?.next ?? window.location.pathname + window.location.search)
      setMethods({
        google: canUseGoogleLogin(navigator.userAgent),
        apple: isAppleLoginAvailable(),
        inApp: isInAppBrowser(navigator.userAgent),
      })
      setExternalHint(false)
      setLastLogin(readLastLogin())
      setError('')
      setReason(d?.reason ?? 'default')
    }
    window.addEventListener(EVENT, onOpen)
    return () => window.removeEventListener(EVENT, onOpen)
  }, [])

  if (!reason) return null
  const copy = COPY[reason]

  // 앱 안 브라우저(스레드·인스타·카톡 등): 구글이 그 안에서는 로그인을 막아서, 같은 로그인 주소를 기본 브라우저로 넘긴다.
  // 로그인은 기본 브라우저에서 끝나고 그쪽에서 이어서 이용한다. 안 넘어가면 '⋯ → 브라우저로 열기' 안내.
  const loginWithGoogleOutside = (e: React.MouseEvent) => {
    e.preventDefault()
    const absolute = new URL(oauthLoginUrl('google', next), window.location.origin).toString()
    window.location.href = externalBrowserUrl(absolute, navigator.userAgent)
    setExternalHint(true)
  }

  const loginWithApple = async () => {
    if (appleBusy) return
    setAppleBusy(true)
    setError('')
    try {
      const { identityToken, rawNonce } = await appleNativeAuth()
      // Supabase 클라이언트는 Apple 로그인에만 필요해 이때 불러온다(모든 화면의 첫 로딩을 무겁게 하지 않게).
      const { createClient } = await import('@/lib/supabase')
      const { error: signInError } = await createClient().auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce: rawNonce,
      })
      if (signInError) throw signInError
      window.location.href = appleFinishUrl(next)
    } catch (err) {
      if (!isAppleCancel(err)) {
        console.error('Apple login error:', err)
        setError('Apple 로그인에 실패했어요. 다시 시도해 주세요.')
      }
      setAppleBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="absolute inset-0 bg-black/40" onClick={() => setReason(null)} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-3xl bg-surface px-5 pb-8 pt-6 shadow-lg">
        <h2 className="text-balance break-keep text-center text-base font-semibold text-text">{copy.title}</h2>
        {/* 화면 폭에 맞춰 글자 크기를 줄여 한 줄에 넣고(27 = 가장 긴 문구 폭 ÷ 글자 크기), 12px로도 넘치면 마지막 글자만 떨어지지 않게 나눈다 */}
        <p className="mt-1.5 text-balance break-keep text-center text-[clamp(12px,calc((100vw_-_40px)/27),14px)] leading-relaxed tracking-tight text-text/60">
          {copy.sub}
        </p>
        {lastLogin && (
          <p className="mt-4 text-center text-xs text-main">지난번에 {AUTH_PROVIDER_LABEL[lastLogin]}로 로그인했어요</p>
        )}
        <div className={`${lastLogin ? 'mt-2' : 'mt-5'} space-y-2`}>
          <a href={oauthLoginUrl('kakao', next)} className={`${BUTTON} bg-[#FEE500] text-[#191919]`}>
            카카오로 계속하기
          </a>
          {methods.apple && (
            <button
              type="button"
              onClick={loginWithApple}
              disabled={appleBusy}
              className={`${BUTTON} bg-black text-white disabled:opacity-60`}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.8 1.3 10.35.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.14-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.74-4.14zM14.47 4.9c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.45z" />
              </svg>
              {appleBusy ? '로그인 중…' : 'Apple로 계속하기'}
            </button>
          )}
          {methods.google && (
            <a
              href={oauthLoginUrl('google', next)}
              onClick={methods.inApp ? loginWithGoogleOutside : undefined}
              className={`${BUTTON} border border-black/10 bg-white text-[#1F1F1F]`}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              구글로 계속하기
            </a>
          )}
          {methods.google && methods.inApp && (
            <p className="break-keep text-center text-[11px] leading-relaxed text-text/45">
              {externalHint
                ? "브라우저가 열리지 않으면 오른쪽 위 ⋯(더보기) → '브라우저로 열기'를 누른 뒤 다시 로그인해 주세요."
                : '구글 로그인은 휴대폰 기본 브라우저에서 이어서 진행돼요.'}
            </p>
          )}
        </div>
        {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
        <button type="button" onClick={() => setReason(null)} className="mt-2 w-full py-2 text-sm text-text/50">
          둘러보기 계속하기
        </button>
      </div>
    </div>,
    document.body
  )
}
