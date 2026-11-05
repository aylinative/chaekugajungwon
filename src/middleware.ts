import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// SEO(19.3): 실서비스 커스텀 도메인만 색인. 베타(chaekugajungwon.vercel.app)·프리뷰 배포는
// 같은 콘텐츠라 중복 색인·도메인 이전 손실을 유발하므로 X-Robots-Tag로 검색 제외한다.
// 색인 허용 호스트 = NEXT_PUBLIC_SITE_URL(없으면 실도메인). www 포함.
const PROD_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bookgardening.co.kr')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  // 로그인 세션 갱신 (2026.11.06) — @supabase/ssr 필수 구성.
  // 서버 화면(Server Component)은 쿠키를 쓸 수 없어서, 토큰(1시간)이 만료되면 서버가 갱신만 하고 새 토큰을 저장하지 못했다.
  // 그러면 브라우저 쿠키에 이미 쓴 옛 토큰이 남아 브라우저의 로그인 확인(getUser)이 멈춘다
  // (휴대폰 운영자 계정 '기록하기 빈 화면'의 원인). 여기서 매 요청 갱신하고 새 토큰을 쿠키에 저장한다.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  )
  // 로그인 쿠키가 있을 때만 확인 — 게스트 요청에 인증 서버 호출을 붙이지 않게
  if (req.cookies.getAll().some((c) => c.name.startsWith('sb-'))) {
    await supabase.auth.getUser()
  }

  const host = (req.headers.get('host') ?? '').toLowerCase()
  const isProd = host === PROD_HOST || host === `www.${PROD_HOST}`
  if (!isProd) {
    // 크롤러가 이 호스트의 페이지를 색인하지 않도록 지시 (베타·프리뷰 전용)
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return res
}

export const config = {
  // 정적 에셋·이미지·서비스워커·아이콘 등은 제외 (세션 갱신·헤더 주입 불필요)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|zxing/|onboarding/|splash/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|txt|xml|wasm)$).*)'],
}
