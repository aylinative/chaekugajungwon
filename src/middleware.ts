import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// SEO(19.3): 실서비스 커스텀 도메인만 색인. 베타(chaekugajungwon.vercel.app)·프리뷰 배포는
// 같은 콘텐츠라 중복 색인·도메인 이전 손실을 유발하므로 X-Robots-Tag로 검색 제외한다.
// 색인 허용 호스트 = NEXT_PUBLIC_SITE_URL(없으면 실도메인). www 포함.
const PROD_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bookgardening.co.kr')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const host = (req.headers.get('host') ?? '').toLowerCase()
  const isProd = host === PROD_HOST || host === `www.${PROD_HOST}`
  if (!isProd) {
    // 크롤러가 이 호스트의 페이지를 색인하지 않도록 지시 (베타·프리뷰 전용)
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return res
}

export const config = {
  // 정적 에셋·이미지 최적화 경로는 제외 (헤더 주입 불필요)
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
