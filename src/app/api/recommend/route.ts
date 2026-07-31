import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { RECOMMEND_GROUPS } from '@/lib/groups'

// post_groups.group_name CHECK 제약은 한글 라벨('씨앗' 등)만 허용.
// 폼에서 넘어오는 그룹 값('seed' 등)을 한글 라벨로 변환.
const GROUP_VALUE_TO_LABEL: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.value, g.label])
)

// 추천하기 폼에서 넘어오는 payload 형태
interface RecommendPayload {
  book_title?: string
  book_author?: string
  book_publisher?: string
  book_pub_date?: string
  book_cover?: string
  book_link?: string
  book_isbn13?: string
  book_is_out_of_print?: boolean
  groups?: string[]
  child_reaction?: number // 1~3 (3=자꾸 꺼내봐요, 2=재밌어했어요, 1=그냥 봤어요)
  reading_amount?: number
  topics?: string[]
  memo?: string
  // photo_urls는 현재 blob URL(임시)이라 저장하지 않음. 실제 Storage 업로드 구현 시 처리.
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RecommendPayload

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              console.error('Cookie set error:', error)
            }
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // --- users 행 self-heal: 콜백에서 생성이 누락된 경우 대비. 있으면 건드리지 않음. ---
    const kakaoId = String(
      user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? user.id
    )
    const nickname =
      user.user_metadata?.nickname ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      '책육아정원 사용자'
    const { error: ensureUserError } = await supabase
      .from('users')
      .upsert(
        { id: user.id, kakao_id: kakaoId, nickname },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    if (ensureUserError) {
      console.error('Ensure user row error:', ensureUserError)
      return NextResponse.json({ error: '사용자 정보 확인에 실패했습니다.' }, { status: 500 })
    }

    // --- 입력 검증 ---
    if (!payload.book_title) {
      return NextResponse.json({ error: '책 정보가 없습니다.' }, { status: 400 })
    }
    if (!Array.isArray(payload.groups) || payload.groups.length === 0) {
      return NextResponse.json(
        { error: '읽어주면 좋은 시기를 하나 이상 골라주세요.' },
        { status: 400 }
      )
    }
    if (!payload.reading_amount) {
      return NextResponse.json({ error: '글밥량을 선택해주세요.' }, { status: 400 })
    }
    const reaction =
      payload.child_reaction && payload.child_reaction >= 1 && payload.child_reaction <= 3
        ? payload.child_reaction
        : 2 // 기본값: 재밌어했어요

    // 책 식별자: ISBN13 우선, 없으면 알라딘 링크로 대체 (aladin_item_id는 NOT NULL)
    const aladinItemId = payload.book_isbn13 || payload.book_link || payload.book_title
    if (!aladinItemId) {
      return NextResponse.json({ error: '책 식별자가 없습니다.' }, { status: 400 })
    }

    // --- 1) 책 upsert: 같은 책이면 재사용, 없으면 신규 등록 ---
    const publishedDate =
      payload.book_pub_date && DATE_RE.test(payload.book_pub_date)
        ? payload.book_pub_date
        : null

    let bookId: string

    const { data: existingBook, error: bookLookupError } = await supabase
      .from('books')
      .select('id')
      .eq('aladin_item_id', aladinItemId)
      .maybeSingle()

    if (bookLookupError) {
      console.error('Book lookup error:', bookLookupError)
      return NextResponse.json({ error: '책 정보 조회에 실패했습니다.' }, { status: 500 })
    }

    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: insertedBook, error: bookInsertError } = await supabase
        .from('books')
        .insert({
          aladin_item_id: aladinItemId,
          title: payload.book_title,
          author: payload.book_author || null,
          publisher: payload.book_publisher || null,
          published_date: publishedDate,
          cover_image_url: payload.book_cover || null,
          aladin_url: payload.book_link || null,
          is_out_of_print: payload.book_is_out_of_print ?? false,
        })
        .select('id')
        .single()

      if (bookInsertError || !insertedBook) {
        console.error('Book insert error:', bookInsertError)
        return NextResponse.json({ error: '책 정보 저장에 실패했습니다.' }, { status: 500 })
      }
      bookId = insertedBook.id
    }

    // --- 2) 게시물(posts) 생성 ---
    const { data: insertedPost, error: postInsertError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        book_id: bookId,
        child_reaction: reaction,
        reread: reaction === 3, // '자꾸 꺼내봐요' = 재독 (하위 호환용)
        text_density: payload.reading_amount,
        content: payload.memo || null,
      })
      .select('id')
      .single()

    if (postInsertError || !insertedPost) {
      console.error('Post insert error:', postInsertError)
      return NextResponse.json({ error: '기록 저장에 실패했습니다.' }, { status: 500 })
    }
    const postId = insertedPost.id

    // 이후 단계 실패 시 고아 게시물이 남지 않도록 롤백용 헬퍼
    const rollbackPost = async () => {
      await supabase.from('posts').delete().eq('id', postId)
    }

    // --- 3) 추천 그룹(post_groups): 폼 값('seed')을 한글 라벨('씨앗')로 변환해 저장 ---
    const groupRows = payload.groups
      .map((value) => GROUP_VALUE_TO_LABEL[value])
      .filter((label): label is string => Boolean(label))
      .map((group_name) => ({ post_id: postId, group_name }))

    if (groupRows.length === 0) {
      await supabase.from('posts').delete().eq('id', postId)
      return NextResponse.json({ error: '유효한 시기가 없습니다.' }, { status: 400 })
    }

    const { error: groupError } = await supabase.from('post_groups').insert(groupRows)
    if (groupError) {
      console.error('Post groups insert error:', groupError)
      await rollbackPost()
      return NextResponse.json({ error: '시기 저장에 실패했습니다.' }, { status: 500 })
    }

    // --- 4) 주제 태그(post_tags): 운영자 태그는 id 연결, 나머지는 custom_tag ---
    if (Array.isArray(payload.topics) && payload.topics.length > 0) {
      const { data: operatorTags, error: opTagError } = await supabase
        .from('operator_tags')
        .select('id, name')
        .eq('is_active', true)

      if (opTagError) {
        console.error('Operator tags lookup error:', opTagError)
        await rollbackPost()
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

      const { error: tagError } = await supabase.from('post_tags').insert(tagRows)
      if (tagError) {
        console.error('Post tags insert error:', tagError)
        await rollbackPost()
        return NextResponse.json({ error: '주제 태그 저장에 실패했습니다.' }, { status: 500 })
      }
    }

    // TODO: post_images(사진), post_children(아이 태그)는
    //       실제 Storage 업로드 / 아이 선택 UI 구현 시 함께 추가.

    // '아이와 함께 읽고 싶은 책'(저장)에 있던 책을 기록했으면 자동으로 저장 해제.
    // (저장 모집단 = '아직 안 읽은 사람' — 기록했으면 목록에서 빠지는 게 맞다)
    // 실패해도 기록 자체는 성공이므로 에러 처리 없이 로그만 남긴다.
    const { error: unbookmarkError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)
    if (unbookmarkError) {
      console.error('Auto-unbookmark error:', unbookmarkError)
    }

    return NextResponse.json({ success: true, postId })
  } catch (error) {
    console.error('Recommendation submit error:', error)
    return NextResponse.json(
      { error: '기록 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
