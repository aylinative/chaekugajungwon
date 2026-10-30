import { NextResponse } from 'next/server'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'

// '찾는 주제가 없나요?' — 사용자 주제 제안 저장 (Part 2, docs/taxonomy/work_order_v1.md)
// 기록 저장과 별개로 즉시 저장. 제안한 주제를 기록의 태그로 달지 않는다.
// 같은 사람이 같은 제안을 다시 보내면(unique 충돌) 성공처럼 처리.
const MAX_LEN = 30

// 집계용: 공백·가운뎃점·빗금·하이픈 제거, 소문자
const normalize = (s: string) => s.replace(/[\s·/\-]/g, '').toLowerCase()

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { text?: unknown; book_key?: unknown }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 })
  if (text.length > MAX_LEN) {
    return NextResponse.json({ error: `${MAX_LEN}자 이내로 적어주세요.` }, { status: 400 })
  }
  const normalized = normalize(text)
  if (!normalized) return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 })

  let bookId: string | null = null
  if (typeof body.book_key === 'string' && body.book_key.trim()) {
    const { data } = await supabase.from('books').select('id').eq('book_key', body.book_key.trim()).maybeSingle()
    bookId = (data as { id: string } | null)?.id ?? null
  }

  const { error } = await supabase
    .from('topic_suggestions')
    .insert({ user_id: user.id, book_id: bookId, text, normalized })
  if (error && error.code !== '23505') {
    console.error('Topic suggestion insert error:', error)
    return NextResponse.json({ error: '보내지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// 운영자: 같은 제안(normalized) 묶음의 상태를 한 번에 바꿈 — 대기/추가함/보류.
// '추가함'을 눌러도 태그가 자동으로 만들어지지 않는다(태그 추가는 운영자가 직접).
export async function PATCH(request: Request) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  if (!(await getIsOperator(supabase, user.id))) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as { normalized?: unknown; status?: unknown }
  const status = body.status
  if (typeof body.normalized !== 'string' || !['pending', 'added', 'declined'].includes(String(status))) {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
  }
  const { error } = await supabase.from('topic_suggestions').update({ status }).eq('normalized', body.normalized)
  if (error) {
    console.error('Topic suggestion update error:', error)
    return NextResponse.json({ error: '바꾸지 못했어요.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
