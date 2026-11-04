'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { kakaoLoginUrl, safeNext } from '@/lib/loginNext'

// 로그인 바텀시트 (2026.11.04 — 둘러보기는 로그인 없이, 계정이 필요한 행동을 할 때만 로그인)
// 어디서든 openLoginSheet('bookmark')로 연다. layout에 LoginSheetHost가 하나 있다.
// 로그인 후에는 지금 보던 화면으로 돌아온다(next). 약관 동의 문구는 여기 두지 않고 가입 화면(/onboarding)에 — 로그인≠가입
export type LoginReason = 'record' | 'recommend' | 'bookmark' | 'mypage' | 'child' | 'report' | 'default'

const COPY: Record<LoginReason, { title: string; sub: string }> = {
  record: { title: '기록을 남기려면 로그인이 필요해요', sub: '아이와 읽은 책을 기록하고 나만의 책육아 일기를 쌓아 보세요.' },
  recommend: { title: '추천하려면 로그인이 필요해요', sub: '아이와 읽어 보고 좋았던 책을 다른 양육자에게 추천해 주세요.' },
  bookmark: { title: '책을 저장하려면 로그인이 필요해요', sub: '나중에 아이와 읽고 싶은 책을 모아 둘 수 있어요.' },
  mypage: { title: '로그인하고 내 책장을 만들어 보세요', sub: '함께 읽은 책, 읽고 싶은 책, 책육아 캘린더를 볼 수 있어요.' },
  child: { title: '우리 아이 시기에 맞춰 보려면 로그인이 필요해요', sub: '아이 생일을 등록하면 지금 시기에 맞는 책을 먼저 보여 드려요.' },
  report: { title: '신고·차단하려면 로그인이 필요해요', sub: '불편한 기록을 알려 주시면 운영자가 확인해요.' },
  default: { title: '로그인이 필요해요', sub: '카카오로 간편하게 시작할 수 있어요.' },
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

export function LoginSheetHost() {
  const [reason, setReason] = useState<LoginReason | null>(null)
  const [next, setNext] = useState('/')

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ reason: LoginReason; next?: string }>).detail
      setNext(d?.next ?? window.location.pathname + window.location.search)
      setReason(d?.reason ?? 'default')
    }
    window.addEventListener(EVENT, onOpen)
    return () => window.removeEventListener(EVENT, onOpen)
  }, [])

  if (!reason) return null
  const copy = COPY[reason]

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="absolute inset-0 bg-black/40" onClick={() => setReason(null)} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-3xl bg-surface px-5 pb-8 pt-6 shadow-lg">
        <h2 className="text-center text-base font-semibold text-text">{copy.title}</h2>
        <p className="mt-1.5 text-center text-sm leading-relaxed text-text/60">{copy.sub}</p>
        <a
          href={kakaoLoginUrl(next)}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#FEE500] py-3 font-medium text-[#191919]"
        >
          카카오로 계속하기
        </a>
        <button type="button" onClick={() => setReason(null)} className="mt-2 w-full py-2 text-sm text-text/50">
          둘러보기 계속하기
        </button>
      </div>
    </div>,
    document.body
  )
}
