import { createBrowserClient } from '@supabase/ssr'

// 로그인 잠금을 '이 화면 안에서만' 건다 (2026.11.06 — 휴대폰 '기록하기 빈 화면' 원인 해결).
// 기본값은 브라우저 전체 잠금(navigator.locks)이라 같은 기기의 다른 탭·홈 화면 앱과 잠금을 같이 쓴다.
// 안드로이드가 백그라운드 탭을 재우면 잠금을 쥔 채 멈출 수 있고, 그러면 다른 화면의 getUser가 끝없이 기다렸다.
// 화면 안 잠금만 쓰면 다른 탭을 기다리지 않는다. 탭끼리 토큰을 동시에 갱신할 수 있지만,
// 갱신은 주로 미들웨어(src/middleware.ts)가 하고 Supabase가 짧은 중복 갱신을 허용해 문제없다.
const chains = new Map<string, Promise<unknown>>()

async function inTabLock<R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const previous = chains.get(name) ?? Promise.resolve()
  const run = previous.catch(() => undefined).then(fn)
  chains.set(
    name,
    run.catch(() => undefined)
  )
  return run
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { lock: inTabLock } }
  )
}
