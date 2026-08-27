import type { MetadataRoute } from 'next'

// PWA 매니페스트 — 모바일 '홈 화면에 추가' 시 커스텀 아이콘·이름 표시.
// App Router가 app/manifest.ts를 자동 인식해 <link rel="manifest">를 주입한다.
// 색상은 임시 브랜드 토큰(한지 아이보리 배경 / 모스그린) — 기본 컬러 확정 시 갱신. (CLAUDE.md 14.5)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '책육아정원',
    short_name: '책육아정원',
    description: '○○개월 아이가 실제로 좋아한 그림책. 월령별 추천 커뮤니티.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF6EC',
    theme_color: '#6B7F5E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
