'use client'

import { useEffect, useState } from 'react'
import OnboardingModal from '@/components/onboarding/OnboardingModal'

// 가입 직후 안내 팝업 (2026.11.04) — 가입 화면(/onboarding)이 끝나면 로그인 시트를 연 화면(next)으로 돌아가는데,
// 그곳이 홈이 아니면 홈의 팝업 판단(users.onboarded_at)이 동작하지 않는다. 그래서 ?welcome=1을 붙여 보내고
// 여기(layout)에서 한 번 띄운다. 주소의 welcome은 바로 지운다(새로고침 때 다시 뜨지 않게).
export default function WelcomeFromUrl() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('welcome') !== '1') return
    url.searchParams.delete('welcome')
    window.history.replaceState(null, '', url.pathname + url.search)
    setShow(true)
  }, [])

  return show ? <OnboardingModal show firstRecord /> : null
}
