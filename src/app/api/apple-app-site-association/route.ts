// 아이폰 유니버설 링크 (2026.11.15) — 공유한 기록·책 링크를 누르면, 앱이 설치된 아이폰에서는 앱으로 열린다.
// 애플이 https://bookgardening.co.kr/.well-known/apple-app-site-association 을 읽어 확인한다(next.config 주소 연결).
// 앱 쪽: App.entitlements의 applinks:bookgardening.co.kr + 받은 주소를 화면에 띄우는 SceneDelegate(앱 브랜치).
// 사이트의 모든 화면을 앱으로 연다(2026.11.15 운영자). 단 로그인(/auth)·API는 브라우저에 그대로 둬야 로그인 흐름이 안 끊긴다.
// 팀 ID는 애플 로그인에 쓰는 환경변수 APPLE_TEAM_ID를 같이 쓴다.
const BUNDLE_ID = 'kr.co.bookgardening.app'

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID
  if (!teamId) return new Response('Not found', { status: 404 })
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${teamId}.${BUNDLE_ID}`],
            components: [
              { '/': '/api/*', exclude: true },
              { '/': '/auth/*', exclude: true },
              { '/': '/.well-known/*', exclude: true },
              { '/': '/*' },
            ],
          },
        ],
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  )
}
