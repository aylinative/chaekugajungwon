import type { MetadataRoute } from 'next'

// 배포 시 NEXT_PUBLIC_SITE_URL을 실제 도메인으로 설정할 것 (sitemap 절대 URL용)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// 개인·비콘텐츠 경로는 크롤링 제외. 콘텐츠(홈·책·기록·시기별·검색)만 색인.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/mypage', '/moderation', '/onboarding', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
