import { startOAuth } from '@/lib/oauthStart'

export async function GET(request: Request) {
  // 구글 계정이 여러 개면 고를 수 있게 한다. 버튼 노출 조건은 lib/authProvider.ts canUseGoogleLogin.
  return startOAuth(request, 'google', { prompt: 'select_account' })
}
