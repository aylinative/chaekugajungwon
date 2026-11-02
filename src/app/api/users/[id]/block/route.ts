import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'

// 이용자 차단/해제 (애플 1.2) — 차단하면 그 사람의 기록이 '나에게만' 책 페이지·기록 상세에서 안 보인다.
// 상대방은 차단 사실을 알 수 없다(user_blocks는 본인만 조회).
async function ctx() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: blockedId } = await params
  const { supabase, user } = await ctx()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  if (blockedId === user.id) return NextResponse.json({ error: '나 자신은 차단할 수 없어요.' }, { status: 400 })

  const { error } = await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: blockedId })
  if (error && error.code !== '23505') {
    console.error('Block insert error:', error)
    return NextResponse.json({ error: '차단하지 못했어요.' }, { status: 500 })
  }
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: blockedId } = await params
  const { supabase, user } = await ctx()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId)
  if (error) {
    console.error('Block delete error:', error)
    return NextResponse.json({ error: '차단을 풀지 못했어요.' }, { status: 500 })
  }
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}
