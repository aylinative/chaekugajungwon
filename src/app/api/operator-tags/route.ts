import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { revalidateFeed, revalidateTopics } from '@/lib/cacheTags'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import { isTagCategory } from '@/lib/tagCategories'

// 운영자 주제 태그 관리 — 운영자 전용 (2026.10 주제 개편: 큰 분류 → 주제 → 세부)
//  POST   { name, tag_category, parent_id? }  : 주제 추가(parent_id 없음) / 세부 추가(parent_id = 상위 주제)
//  PATCH  { id, name?, tag_category?, is_active?, chip_example?, search_aliases?, intro_keywords?,
//           intro_excludes?, sort_order? }    : 수정 (주제의 큰 분류를 옮기면 그 세부도 함께)
//  DELETE { id }                              : 숨김 + 연결 0건일 때만 완전 삭제
// ※ 숨김(is_active=false)은 삭제가 아님 — 기존 기록 연결 유지(CLAUDE.md 8.1).

const TAG_COLUMNS =
  'id, slug, name, level, parent_id, tag_category, is_active, sort_order, chip_example, search_aliases, intro_keywords, intro_excludes'

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

function refresh() {
  revalidatePath('/', 'layout')
  revalidateFeed()
  revalidateTopics() // 기록하기 주제 목록·검색 별칭(하루 캐시)도 즉시 갱신
}

// '달|달님|보름달' 또는 '달, 달님' → ['달','달님','보름달'] (빈 값·중복 제거)
function toList(v: unknown): string[] | null {
  if (v === undefined) return null
  const raw = Array.isArray(v) ? v.join('|') : typeof v === 'string' ? v : ''
  return [...new Set(raw.split(/[|,\n]/).map((s) => s.trim()).filter(Boolean))]
}

export async function POST(request: Request) {
  const ctx = await requireOperator()
  if (ctx.error) return ctx.error
  const { supabase, user } = ctx

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })

  let category = body.tag_category
  let level: 'topic' | 'detail' = 'topic'
  let parentId: string | null = null
  if (body.parent_id) {
    const { data: parent } = await supabase
      .from('operator_tags')
      .select('id, level, tag_category')
      .eq('id', body.parent_id)
      .maybeSingle()
    if (!parent || parent.level !== 'topic')
      return NextResponse.json({ error: '상위 주제를 찾을 수 없어요.' }, { status: 400 })
    level = 'detail'
    parentId = parent.id
    category = parent.tag_category
  }
  if (!isTagCategory(category)) return NextResponse.json({ error: '큰 분류를 선택하세요.' }, { status: 400 })

  // 이름 중복 방지 (숨김 포함 — 같은 이름이 둘이면 표시·검색이 꼬임)
  const { data: dup } = await supabase.from('operator_tags').select('id, is_active').eq('name', name).maybeSingle()
  if (dup)
    return NextResponse.json(
      { error: `이미 있는 이름이에요${dup.is_active ? '' : ' (숨김 상태 — 다시 보이게 하세요)'}.` },
      { status: 409 }
    )

  // 같은 묶음(큰 분류의 주제들 / 한 주제의 세부들) 맨 뒤로
  let lastQ = supabase.from('operator_tags').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  lastQ = parentId ? lastQ.eq('parent_id', parentId) : lastQ.eq('tag_category', category).eq('level', 'topic')
  const { data: last } = await lastQ.maybeSingle()
  const sort_order = ((last?.sort_order as number | undefined) ?? 0) + 1

  const slug = `op-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` // 운영자 추가 태그 고유값
  const { data, error } = await supabase
    .from('operator_tags')
    .insert({ slug, name, level, parent_id: parentId, tag_category: category, is_active: true, sort_order, created_by: user.id })
    .select(TAG_COLUMNS)
    .single()
  if (error) {
    console.error('operator-tags POST error:', error)
    return NextResponse.json({ error: '추가에 실패했습니다.' }, { status: 500 })
  }
  refresh()
  return NextResponse.json({ tag: data })
}

export async function DELETE(request: Request) {
  const ctx = await requireOperator()
  if (ctx.error) return ctx.error
  const { supabase } = ctx

  const { id } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: '대상이 없습니다.' }, { status: 400 })

  const { data: tag } = await supabase.from('operator_tags').select('is_active').eq('id', id).maybeSingle()
  if (!tag) return NextResponse.json({ error: '태그를 찾을 수 없습니다.' }, { status: 404 })
  if (tag.is_active)
    return NextResponse.json({ error: '보이는 태그는 삭제할 수 없어요. 먼저 숨김으로 바꿔주세요.' }, { status: 400 })

  const [{ count }, { count: children }] = await Promise.all([
    supabase.from('post_tags').select('*', { count: 'exact', head: true }).eq('tag_id', id),
    supabase.from('operator_tags').select('*', { count: 'exact', head: true }).eq('parent_id', id),
  ])
  if ((count ?? 0) > 0)
    return NextResponse.json({ error: `기록 ${count}건에 연결돼 있어 삭제할 수 없어요. 숨김 상태로 두세요.` }, { status: 409 })
  if ((children ?? 0) > 0)
    return NextResponse.json({ error: '세부가 있는 주제는 삭제할 수 없어요.' }, { status: 409 })

  const { error } = await supabase.from('operator_tags').delete().eq('id', id)
  if (error) {
    console.error('operator-tags DELETE error:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }
  refresh()
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const ctx = await requireOperator()
  if (ctx.error) return ctx.error
  const { supabase } = ctx

  const body = await request.json().catch(() => ({}))
  const id = body.id
  if (!id) return NextResponse.json({ error: '대상이 없습니다.' }, { status: 400 })

  const { data: cur } = await supabase.from('operator_tags').select('id, level').eq('id', id).maybeSingle()
  if (!cur) return NextResponse.json({ error: '태그를 찾을 수 없습니다.' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })
    const { data: dup } = await supabase.from('operator_tags').select('id').eq('name', name).neq('id', id).maybeSingle()
    if (dup) return NextResponse.json({ error: '이미 있는 이름이에요.' }, { status: 409 })
    patch.name = name
  }
  if (body.tag_category !== undefined) {
    if (cur.level !== 'topic') return NextResponse.json({ error: '세부는 상위 주제의 큰 분류를 따라요.' }, { status: 400 })
    if (!isTagCategory(body.tag_category)) return NextResponse.json({ error: '큰 분류가 올바르지 않습니다.' }, { status: 400 })
    patch.tag_category = body.tag_category
  }
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active)
  if (body.chip_example !== undefined)
    patch.chip_example = typeof body.chip_example === 'string' ? body.chip_example.trim() || null : null
  for (const key of ['search_aliases', 'intro_keywords', 'intro_excludes'] as const) {
    const list = toList(body[key])
    if (list) patch[key] = list
  }
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order)
    if (!Number.isFinite(n)) return NextResponse.json({ error: '정렬 값은 숫자예요.' }, { status: 400 })
    patch.sort_order = Math.round(n)
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: '변경 내용이 없습니다.' }, { status: 400 })

  const { data, error } = await supabase.from('operator_tags').update(patch).eq('id', id).select(TAG_COLUMNS).single()
  if (error) {
    console.error('operator-tags PATCH error:', error)
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
  }
  // 주제의 큰 분류를 옮기면 그 세부도 같은 큰 분류로
  if (patch.tag_category) {
    await supabase.from('operator_tags').update({ tag_category: patch.tag_category }).eq('parent_id', id)
  }
  refresh()
  return NextResponse.json({ tag: data })
}
