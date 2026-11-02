import type { MetadataRoute } from 'next'

// PWA 매니페스트 — 모바일 '홈 화면에 추가' 시 커스텀 아이콘·이름 표시.
// App Router가 app/manifest.ts를 자동 인식해 <link rel="manifest">를 주입한다.
// 색상: 한지 아이보리 배경(#FBF6EC) / 포인트 살구코랄(#E08F5B) — 임시 토큰, 기본 컬러 확정 시 갱신. (CLAUDE.md 14.5)
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '책육아정원',
    short_name: '책육아정원',
    description: '그림책 추천 커뮤니티 — 아이 시기별 책 기록과 추천',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FBF6EC',
    theme_color: '#E08F5B',
    categories: ['education', 'lifestyle'],
    prefer_related_applications: false,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      {
        src: '/screenshots/home.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: '홈 화면 — 시기별 그림책 추천',
      },
      {
        src: '/screenshots/record.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: '기록하기 — 바코드로 책 검색',
      },
    ],
  }
}
