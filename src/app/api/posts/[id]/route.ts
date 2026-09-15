import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'
import { RECOMMEND_GROUPS } from '@/lib/groups'

// post_groups.group_name CHECK는 한글 라벨만 허용 — 폼 값('seed')을 라벨('씨앗')로 변환.
const GROUP_VALUE_TO_LABEL: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.value, g.label])
)

interface EditPayload {
  book_title?: string
  book_author?: string
  book_publisher?: string
  book_pub_date?: string
  book_cover?: string
  book_link?: string
  book_isbn13?: string
  book_is_out_of_print?: boolean
  groups?: string[]
  child_reaction?: number
  reading_amount?: number
  topics?: string[]
  is_board_book?: boolean
  memo?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// 내 기록 수정 — 작성자 본인만. 선택한 책(교체 가능)·시기(post_groups)·반응·
// 글밥량·일기(posts)·주제(post_tags)를 갱신한다. 사진은 건드리지 않는다.
// RLS: posts_update_own, post_groups/tags_write_own(ALL)로 작성자 UPDATE/DELETE 허용됨.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 작성자 확인 (숨김 상태는 수정 대상 아님)
  const { data: post, error: lookupError } = await supabase
    .from('posts')
    .select('id, user_id, book_id')
    .eq('id', postId)
    .is('hidden_at', null)
    .maybeSingle()
  if (lookupError) {
    console.error('Post lookup error:', lookupError)
    return NextResponse.json({ error: '기록 조회에 실패했습니다.' }, { status: 500 })
  }
  if (!post) {
    return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (post.user_id !== user.id) {
    return NextResponse.json({ error: '본인 기록만 수정할 수 있어요.' }, { status: 403 })
  }

  const payload = (await request.json().catch(() => ({}))) as EditPayload

  // 검증
  if (!Array.isArray(payload.groups) || payload.groups.length === 0) {
    return NextResponse.json(
      { error: '읽어주면 좋은 시기를 하나 이상 골라주세요.' },
      { status: 400 }
    )
  }
  if (payload.reading_amount == null) {
    // 0(글 없는 그림책)은 유효값 — null/undefined만 거부
    return NextResponse.json({ error: '글밥량을 선택해주세요.' }, { status: 400 })
  }
  const reaction =
    payload.child_reaction && payload.child_reaction >= 1 && payload.child_reaction <= 3
      ? payload.child_reaction
      : 2

  const groupRows = payload.groups
    .map((value) => GROUP_VALUE_TO_LABEL[value])
    .filter((label): label is string => Boolean(label))
    .map((group_name) => ({ post_id: postId, group_name }))
  if (groupRows.length === 0) {
    return NextResponse.json({ error: '유효한 시기가 없습니다.' }, { status: 400 })
  }

  // 0) 선택한 책 해석 — 책을 바꿨을 수 있으므로 book_key(ISBN13 우선)로 찾거나 새로 만든다.
  //    기존 DB에 있는 책이면 그 책에 연결되어, 수정된 기록이 해당 책 페이지에 누적 반영된다.
  //    책 정보가 없으면(구버전 폼 등) 기존 book_id를 그대로 유지한다.
  let effectiveBookId = post.book_id as string | null
  if (payload.book_title) {
    const bookKey = payload.book_isbn13 || payload.book_link || payload.book_title
    const { data: existingBook, error: bookLookupError } = await supabase
      .from('books')
      .select('id')
      .eq('book_key', bookKey)
      .maybeSingle()
    if (bookLookupError) {
      console.error('Book lookup error:', bookLookupError)
      return NextResponse.json({ error: '책 정보 조회에 실패했습니다.' }, { status: 500 })
    }
    if (existingBook) {
      effectiveBookId = existingBook.id
    } else {
      const publishedDate =
        payload.book_pub_date && DATE_RE.test(payload.book_pub_date)
          ? payload.book_pub_date
          : null
      const { data: insertedBook, error: bookInsertError } = await supabase
        .from('books')
        .insert({
          book_key: bookKey,
          title: payload.book_title,
          author: payload.book_author || null,
          publisher: payload.book_publisher || null,
          published_date: publishedDate,
          cover_image_url: payload.book_cover || null,
          source_url: payload.book_link || null,
          is_out_of_print: payload.book_is_out_of_print ?? false,
          is_board_book: payload.is_board_book ?? false,
        })
        .select('id')
        .single()
      if (bookInsertError || !insertedBook) {
        console.error('Book insert error:', bookInsertError)
        return NextResponse.json({ error: '책 정보 저장에 실패했습니다.' }, { status: 500 })
      }
      effectiveBookId = insertedBook.id
    }

    // 책이 바뀌었으면 posts.book_id 갱신
    if (effectiveBookId && effectiveBookId !== post.book_id) {
      const { error: bookIdError } = await supabase
        .from('posts')
        .update({ book_id: effectiveBookId })
        .eq('id', postId)
      if (bookIdError) {
        console.error('Post book_id update error:', bookIdError)
        return NextResponse.json({ error: '책 변경에 실패했습니다.' }, { status: 500 })
      }
      // 새로 연결된 책이 '저장(북마크)' 목록에 있으면 해제 — 기록했으면 위시리스트에서 빠진다.
      const { error: unbookmarkError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', effectiveBookId)
      if (unbookmarkError) console.error('Auto-unbookmark error:', unbookmarkError)
    }
  }

  // 1) posts 본문 갱신
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      child_reaction: reaction,
      reread: reaction === 3, // 하위 호환
      text_density: payload.reading_amount,
      content: payload.memo || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
  if (updateError) {
    console.error('Post update error:', updateError)
    return NextResponse.json({ error: '기록 수정에 실패했습니다.' }, { status: 500 })
  }

  // 보드북 여부(책 속성) 반영 — 교체됐을 수 있으므로 현재 연결된 책에 적용
  if (typeof payload.is_board_book === 'boolean' && effectiveBookId) {
    await supabase
      .from('books')
      .update({ is_board_book: payload.is_board_book })
      .eq('id', effectiveBookId)
  }

  // 2) 시기(post_groups) 교체 — 전부 삭제 후 재삽입
  const { error: groupDeleteError } = await supabase
    .from('post_groups')
    .delete()
    .eq('post_id', postId)
  if (groupDeleteError) {
    console.error('Post groups delete error:', groupDeleteError)
    return NextResponse.json({ error: '시기 수정에 실패했습니다.' }, { status: 500 })
  }
  const { error: groupInsertError } = await supabase.from('post_groups').insert(groupRows)
  if (groupInsertError) {
    console.error('Post groups insert error:', groupInsertError)
    return NextResponse.json({ error: '시기 수정에 실패했습니다.' }, { status: 500 })
  }

  // 3) 주제(post_tags) 교체 — 전부 삭제 후, 있으면 재삽입
  const { error: tagDeleteError } = await supabase
    .from('post_tags')
    .delete()
    .eq('post_id', postId)
  if (tagDeleteError) {
    console.error('Post tags delete error:', tagDeleteError)
    return NextResponse.json({ error: '주제 수정에 실패했습니다.' }, { status: 500 })
  }
  if (Array.isArray(payload.topics) && payload.topics.length > 0) {
    const { data: operatorTags, error: opTagError } = await supabase
      .from('operator_tags')
      .select('id, name')
      .eq('is_active', true)
    if (opTagError) {
      console.error('Operator tags lookup error:', opTagError)
      return NextResponse.json({ error: '태그 조회에 실패했습니다.' }, { status: 500 })
    }
    const nameToId = new Map(
      (operatorTags ?? []).map((t: { id: string; name: string }) => [t.name, t.id])
    )
    const tagRows = payload.topics.map((topic) => {
      const tagId = nameToId.get(topic)
      return tagId
        ? { post_id: postId, tag_id: tagId, is_operator_tag: true }
        : { post_id: postId, custom_tag: topic, is_operator_tag: false }
    })
    const { error: tagInsertError } = await supabase.from('post_tags').insert(tagRows)
    if (tagInsertError) {
      console.error('Post tags insert error:', tagInsertError)
      return NextResponse.json({ error: '주제 수정에 실패했습니다.' }, { status: 500 })
    }
  }

  // 홈·책 페이지·상세·마이페이지 캐시 반영
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true, postId })
}
