import { createSign } from 'node:crypto'

// 탈퇴할 때 Apple 로그인 연결 끊기(Apple TN3194). 토큰을 저장하지 않고, 탈퇴 직전 Apple 확인으로 받은
// authorization code를 토큰으로 바꿔 바로 취소한다.
// 환경변수(서버 전용): APPLE_TEAM_ID, APPLE_SIGNIN_KEY_ID, APPLE_SIGNIN_PRIVATE_KEY(.p8 내용, 줄바꿈은 \n 허용)
const APPLE_CLIENT_ID = 'kr.co.bookgardening.app' // 앱 번들 ID

const base64Url = (input: string | Buffer) => Buffer.from(input).toString('base64url')

function clientSecret(): string | null {
  const teamId = process.env.APPLE_TEAM_ID
  const keyId = process.env.APPLE_SIGNIN_KEY_ID
  const privateKey = process.env.APPLE_SIGNIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!teamId || !keyId || !privateKey) return null

  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const payload = base64Url(
    JSON.stringify({ iss: teamId, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: APPLE_CLIENT_ID })
  )
  const signature = createSign('SHA256')
    .update(`${header}.${payload}`)
    .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
  return `${header}.${payload}.${base64Url(signature)}`
}

async function postApple(path: string, secret: string, params: Record<string, string>) {
  return fetch(`https://appleid.apple.com/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: APPLE_CLIENT_ID, client_secret: secret, ...params }),
  })
}

// 실패해도 계정 삭제는 진행한다(사용자 의사 우선). 결과는 로그로만 남긴다.
export async function revokeAppleByCode(code: string): Promise<boolean> {
  try {
    const secret = clientSecret()
    if (!secret) {
      console.error('Account delete: apple revoke skipped (env missing)')
      return false
    }
    const tokenRes = await postApple('token', secret, { code, grant_type: 'authorization_code' })
    if (!tokenRes.ok) {
      console.error('Account delete: apple token failed', tokenRes.status, await tokenRes.text().catch(() => ''))
      return false
    }
    const { refresh_token: refreshToken, access_token: accessToken } = (await tokenRes.json()) as {
      refresh_token?: string
      access_token?: string
    }
    const token = refreshToken ?? accessToken
    if (!token) return false
    const revokeRes = await postApple('revoke', secret, {
      token,
      token_type_hint: refreshToken ? 'refresh_token' : 'access_token',
    })
    if (!revokeRes.ok) {
      console.error('Account delete: apple revoke failed', revokeRes.status, await revokeRes.text().catch(() => ''))
      return false
    }
    return true
  } catch (err) {
    console.error('Account delete: apple revoke error', err)
    return false
  }
}
