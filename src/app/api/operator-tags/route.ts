import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import { isTagCategory } from '@/lib/tagCategories'

// 운영자 주제 태그 관리 — 운영자 전용.
//  POST  { name, tag_category }                : 신규 태그 추가 (카테고리 내 맨 뒤 정렬)
//  PATCH { id, name?, tag_category?, is_active? }: 개명 / 카테고리 이동 / 활성·비활성
// ※ 삭제는 두지 않는다 — 비활성(is_active=false)으로 히스토리 보존(CLAUDE.md 8.1).

async function requireOperator() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }
  if (!(await getIsOperator(supabase, user.id)))
    return { error: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }) }
  return { supabase, user }
}

export async function POST(request: Request) {
  const ctx = await requireOperator()
  if (ctx.error) return ctx.error
  const { supabase, user } = ctx

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const category = body.tag_category
  if (!name) return NextResponse.json({ error: '태그 이름을 입력하세요.' }, { status: 400 })
  if (!isTagCategory(category))
    return NextResponse.json({ error: '카테고리를 선택하세요.' }, { status: 400 })

  // 이름 중복 방지 (활성·비활성 무관 — 같은 이름 두 개면 집계·표시가 꼬임)
  const { data: dup } = await supabase
    .from('operator_tags')
    .select('id, is_active')
    .eq('name', name)
    .maybeSingle()
  if (dup)
    return NextResponse.json(
      { error: `이미 있는 태그입니다${dup.is_active ? '' : ' (비활성 상태 — 활성화하세요)'}.` },
      { status: 409 }
    )

  // 카테고리 내 맨 뒤로 정렬
  const { data: last } = await supabase
    .from('operator_tags')
    .select('sort_order')
    .eq('tag_category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sort_order = ((last?.sort_order as number | undefined) ?? -1) + 1

  const { data, error } = await supabase
    .from('operator_tags')
    .insert({ name, tag_category: category, is_active: true, sort_order, created_by: user.id })
    .select('id, name, tag_category, is_active, sort_order')
    .single()
  if (error) {
    console.error('operator-tags POST error:', error)
    return NextResponse.json({ error: '추가에 실패했습니다.' }, { status: 500 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ tag: data })
}

// 완전 삭제 — 비활성 태그만 허용(활성은 먼저 비활성화하게 해 실수 방지).
// post_tags는 FK on delete cascade라 연결된 기록에서도 이 주제가 사라진다.
export async function DELETE(request: Request) {
  const ctx = await requireOperator()
  if (ctx.error) return ctx.error
  const { supabase } = ctx

  const { id } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: '대상이 없습니다.' }, { status: 400 })

  const { data: tag } = await supabase
    .from('operator_tags')
    .select('is_active')
    .eq('id', id)
    .maybeSingle()
  if (!tag) return NextResponse.json({ error: '태그를 찾을 수 없습니다.' }, { status: 404 })
  if (tag.is_active)
    return NextResponse.json(
      { error: '활성 태그는 삭제할 수 없어요. 먼저 비활성으로 바꿔주세요.' },
      { status: 400 }
    )

  // 연결된 기록이 있으면 삭제 불가(post_tags FK는 cascade 아님 + 타인 기록 태그를 지우는 건 부적절).
  // 연결이 남은 태그는 비활성으로 두어 히스토리를 보존한다.
  const { count } = await supabase
    .from('post_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', id)
  if ((count ?? 0) > 0)
    return NextResponse.json(
      { error: `기록 ${count}건에 연결돼 있어 삭제할 수 없어요. 비활성 상태로 두세요.` },
      { status: 409 }
    )

  const { error } = await supabase.from('operator_tags').delete().eq('id', id)
  if (error) {
    console.error('operator-tags DELETE error:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const ctx = await requireOperator()
  if (ctx.error) return ctx.error
  const { supabase } = ctx

  const body = await request.json().catch(() => ({}))
  const id = body.id
  if (!id) return NextResponse.json({ error: '대상이 없습니다.' }, { status: 400 })

  const patch: { name?: string; tag_category?: string; is_active?: boolean } = {}

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: '태그 이름을 입력하세요.' }, { status: 400 })
    // 다른 태그와 이름 충돌 방지
    const { data: dup } = await supabase
      .from('operator_tags')
      .select('id')
      .eq('name', name)
      .neq('id', id)
      .maybeSingle()
    if (dup) return NextResponse.json({ error: '이미 있는 태그 이름입니다.' }, { status: 409 })
    patch.name = name
  }
  if (body.tag_category !== undefined) {
    if (!isTagCategory(body.tag_category))
      return NextResponse.json({ error: '카테고리가 올바르지 않습니다.' }, { status: 400 })
    patch.tag_category = body.tag_category
  }
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active)

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: '변경 내용이 없습니다.' }, { status: 400 })

  const { data, error } = await supabase
    .from('operator_tags')
    .update(patch)
    .eq('id', id)
    .select('id, name, tag_category, is_active, sort_order')
    .single()
  if (error) {
    console.error('operator-tags PATCH error:', error)
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ tag: data })
}
