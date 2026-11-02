import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '연결이 끊겼어요 | 책육아정원',
  robots: { index: false, follow: false },
}

// 오프라인 안내 — 서비스 워커(public/sw.js)가 설치 때 미리 받아 두었다가, 인터넷이 끊긴 상태에서
// 페이지를 열면 대신 보여준다. CSS 파일이 캐시에 없을 수 있어 스타일은 인라인으로 둔다.
// (이 페이지가 없으면 서비스 워커 설치가 실패한다 — 2026.11.03)
export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 24px',
        background: '#FBF6EC',
        color: '#3A332B',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span style={{ fontSize: 40 }} aria-hidden>
        🌱
      </span>
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>인터넷 연결이 끊겼어요</h1>
      <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'rgba(58,51,43,0.65)' }}>
        와이파이나 데이터 연결을 확인한 뒤
        <br />
        다시 시도해 주세요.
      </p>
      <a
        href="/"
        style={{
          marginTop: 8,
          borderRadius: 12,
          background: '#6B7F5E',
          color: '#fff',
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        다시 시도하기
      </a>
    </main>
  )
}
