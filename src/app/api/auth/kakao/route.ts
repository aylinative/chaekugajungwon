import { startOAuth } from '@/lib/oauthStart'

export async function GET(request: Request) {
  return startOAuth(request, 'kakao', {
    // 닉네임만 받는다 — 프로필 사진은 서비스에서 쓰지 않아 수집하지 않음(개인정보 최소 수집, 2026.11.03).
    // 카카오 디벨로퍼스 동의항목의 '프로필 사진'도 '사용 안 함'으로 맞출 것. 바꾸면 /privacy 수집 항목도 함께.
    scope: 'profile_nickname',
  })
}
