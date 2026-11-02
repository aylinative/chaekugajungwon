import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'
import { revalidateFeed } from '@/lib/cacheTags'

// 회원 탈퇴 (2026.11.03, A안 = 전부 삭제 — 개인정보처리방침 '보유 기간과 파기')
// 순서: ① 사진 파일 삭제(Storage — SQL로 지우면 파일이 남음) ② 카카오 연결 끊기 ③ DB 삭제(delete_my_account)
//       ④ 로그아웃 쿠키 정리. ①②가 실패해도 계정 삭제는 진행(사용자 의사 우선, 실패는 로그로 남김).
// 운영자 계정은 탈퇴 불가 — 실수로 관리 권한을 잃지 않게.
const BUCKET = 'post-images'
const CONFIRM_WORD = '탈퇴'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { confirm?: unknown }
  if (body.confirm !== CONFIRM_WORD) {
    return NextResponse.json({ error: `'${CONFIRM_WORD}'를 입력해 주세요.` }, { status: 400 })
  }

  const { data: me } = await supabase.from('users').select('kakao_id, is_operator').eq('id', user.id).maybeSingle()
  if ((me as { is_operator?: boolean } | null)?.is_operator) {
    return NextResponse.json({ error: '운영자 계정은 탈퇴할 수 없어요. 운영자 권한을 먼저 해제해 주세요.' }, { status: 403 })
  }

  // ① 사진 파일: 내 폴더(post-images/{user_id}/) 전부 삭제 — RLS상 본인 폴더만 지울 수 있음
  try {
    for (let i = 0; i < 50; i++) {
      const { data: files, error } = await supabase.storage.from(BUCKET).list(user.id, { limit: 100 })
      if (error || !files || files.length === 0) break
      const { error: rmError } = await supabase.storage.from(BUCKET).remove(files.map((f) => `${user.id}/${f.name}`))
      if (rmError) {
        console.error('Account delete: storage remove error', rmError)
        break
      }
    }
  } catch (err) {
    console.error('Account delete: storage error', err)
  }

  // ② 카카오 연결 끊기 (Admin 키로 회원번호 지정) — 다시 가입할 때 동의 화면부터 새로 시작되게
  const kakaoId = (me as { kakao_id?: string } | null)?.kakao_id
  const adminKey = process.env.KAKAO_ADMIN_KEY
  if (adminKey && kakaoId && /^\d+$/.test(kakaoId)) {
    try {
      const res = await fetch('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST',
        headers: {
          Authorization: `KakaoAK ${adminKey}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: new URLSearchParams({ target_id_type: 'user_id', target_id: kakaoId }),
      })
      if (!res.ok) console.error('Account delete: kakao unlink failed', res.status, await res.text().catch(() => ''))
    } catch (err) {
      console.error('Account delete: kakao unlink error', err)
    }
  } else {
    console.error('Account delete: kakao unlink skipped (admin key or kakao_id missing)')
  }

  // ③ DB: 기록·아이 정보·추천·저장·제안·계정 전부 (supabase/add_delete_account.sql)
  const { error: rpcError } = await supabase.rpc('delete_my_account')
  if (rpcError) {
    console.error('Account delete: rpc error', rpcError)
    return NextResponse.json({ error: '탈퇴 처리에 실패했어요. 잠시 후 다시 시도하거나 문의해 주세요.' }, { status: 500 })
  }

  // ④ 로그인 쿠키 정리 (계정이 없어져 세션은 이미 무효)
  await supabase.auth.signOut().catch(() => {})

  revalidatePath('/', 'layout')
  revalidateFeed() // 탈퇴자의 기록이 홈에서 바로 빠지게
  return NextResponse.json({ success: true })
}
