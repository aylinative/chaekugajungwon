'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { RECOMMEND_GROUPS } from '@/lib/groups'
import { CHILD_REACTIONS } from '@/lib/reactions'
import { densityHint } from '@/lib/density'
import { groupTagsByCategory, type TagCategoryGroup, type OperatorTagRow } from '@/lib/tags'
import BookCover from '@/components/BookCover'

interface BookItem {
  title: string
  author: string
  publisher: string
  pubDate: string
  cover: string
  link: string
  isbn13: string
  isOutOfPrint: boolean
}

// 글밥량 = 페이지당 글 양(중립 속성). 별점 연상을 피해 게이지+부연으로 표시.
const amountOptions = [0, 1, 2, 3, 4, 5] // 0 = 글 없는 그림책(바 채움 없음)
// 시기 라벨('씨앗')→폼 값('seed') 역매핑 — 편집 모드에서 기존 post_groups 프리필용
const GROUP_LABEL_TO_VALUE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.value])
)

function RecommendCreateInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 첫 기록 모드(11.4): 온보딩 직후 또는 기록 0건 상태에서 진입. 배너 + 완료 후 홈 이동.
  const isFirst = searchParams.get('first') === '1'
  // 편집 모드(?edit=<postId>): 내 기록 수정. 책은 고정, 시기·반응·글밥량·주제·일기만 편집.
  const editId = searchParams.get('edit')
  const isEdit = Boolean(editId)
  // 검색 화면 '첫 기록 남기기'에서 넘어오면 책 제목이 미리 채워진다 → 진입 즉시 자동 검색
  const [query, setQuery] = useState(() => searchParams.get('query') ?? '')
  const [books, setBooks] = useState<BookItem[]>([])
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedReaction, setSelectedReaction] = useState<number>(2)
  const [showReactionInfo, setShowReactionInfo] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(3)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [tagGroups, setTagGroups] = useState<TagCategoryGroup[]>([]) // 운영자 태그(DB) 카테고리별
  const [activeCat, setActiveCat] = useState(0) // 주제: 카테고리 탭(드릴다운)
  const [showTopicInfo, setShowTopicInfo] = useState(false)
  const [isBoardBook, setIsBoardBook] = useState(false) // 보드북 여부(책 속성)
  const [memo, setMemo] = useState('')
  // 사진: 실제 File을 들고 있다가 제출 시 Storage 업로드. preview는 blob URL(표시 전용).
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const runSearch = async (keyword: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/books/search?query=${encodeURIComponent(keyword)}`
      )
      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || '검색에 실패했습니다.')
      }

      setBooks(data.items || [])
      setShowDropdown(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  // 입력 시 300ms 디바운스 후 자동 검색 (자동완성 드롭다운)
  useEffect(() => {
    if (isEdit) return // 편집 모드는 책 고정 — 검색하지 않음
    const keyword = query.replace(/\s+/g, ' ').trim()
    // 책을 막 선택해 제목이 채워진 경우엔 재검색하지 않음
    if (selectedBook && keyword === selectedBook.title) return
    // 한 글자 제목('점' 등)도 검색 가능해야 하므로 최소 길이는 1
    if (keyword.length < 1) {
      setBooks([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(() => runSearch(keyword), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const selectBook = (book: BookItem) => {
    setSelectedBook(book)
    setQuery(book.title)
    setShowDropdown(false)
    setBooks([])
  }

  // 주제 태그를 DB(operator_tags)에서 카테고리별로 로드 (하드코딩 제거 — DB가 단일 소스)
  useEffect(() => {
    async function loadTags() {
      const supabase = createClient()
      const { data } = await supabase
        .from('operator_tags')
        .select('name, tag_category, sort_order')
        .eq('is_active', true)
      setTagGroups(groupTagsByCategory((data as OperatorTagRow[] | null) ?? []))
    }
    loadTags()
  }, [])

  // 편집 모드: 기존 기록을 불러와 프리필 (작성자 아니면 홈으로)
  useEffect(() => {
    if (!editId) return
    async function loadPost() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data } = await supabase
        .from('posts')
        .select(
          `id, user_id, child_reaction, text_density, content,
           book:books ( title, author, publisher, published_date, cover_image_url, source_url, book_key, is_out_of_print, is_board_book ),
           post_groups ( group_name ),
           post_tags ( custom_tag, is_operator_tag, operator_tags ( name ) )`
        )
        .eq('id', editId)
        .is('hidden_at', null)
        .maybeSingle()

      const row = data as unknown as {
        user_id: string
        child_reaction: number | null
        text_density: number | null
        content: string | null
        book: {
          title: string | null
          author: string | null
          publisher: string | null
          published_date: string | null
          cover_image_url: string | null
          source_url: string | null
          book_key: string | null
          is_out_of_print: boolean | null
          is_board_book: boolean | null
        } | null
        post_groups: { group_name: string }[] | null
        post_tags:
          | { custom_tag: string | null; is_operator_tag: boolean; operator_tags: { name: string } | null }[]
          | null
      } | null

      if (!row || row.user_id !== user.id) {
        router.push('/') // 없거나 내 기록이 아니면 접근 불가
        return
      }

      const b = row.book
      if (b) {
        setSelectedBook({
          title: b.title ?? '',
          author: b.author ?? '',
          publisher: b.publisher ?? '',
          pubDate: b.published_date ?? '',
          cover: b.cover_image_url ?? '',
          link: b.source_url ?? '',
          isbn13: b.book_key ?? '',
          isOutOfPrint: Boolean(b.is_out_of_print),
        })
        setQuery(b.title ?? '')
        setIsBoardBook(Boolean(b.is_board_book))
      }
      setSelectedGroups(
        (row.post_groups ?? [])
          .map((g) => GROUP_LABEL_TO_VALUE[g.group_name])
          .filter((v): v is string => Boolean(v))
      )
      if (row.child_reaction) setSelectedReaction(row.child_reaction)
      if (row.text_density) setSelectedAmount(row.text_density)
      setSelectedTopics(
        (row.post_tags ?? [])
          .map((t) => (t.is_operator_tag ? t.operator_tags?.name : t.custom_tag))
          .filter((v): v is string => Boolean(v))
      )
      setMemo(row.content ?? '')
    }
    loadPost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const toggleGroup = (groupValue: string) => {
    setSelectedGroups((current) =>
      current.includes(groupValue)
        ? current.filter((item) => item !== groupValue)
        : [...current, groupValue]
    )
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : [...current, topic]
    )
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const added = files.map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setPhotos((current) => [...current, ...added].slice(0, 3))
    event.target.value = '' // 같은 파일 다시 선택 가능하도록 초기화
  }

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      const target = current[index]
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (!selectedBook) {
      setSubmitError('책을 먼저 선택해주세요.')
      return
    }

    if (selectedGroups.length === 0) {
      setSubmitError('읽어주면 좋은 시기를 하나 이상 골라주세요.')
      return
    }

    if (!memo.trim()) {
      setSubmitError('책육아 일기를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      // 편집 모드: 책·사진은 그대로 두고 속성(시기·반응·글밥량·주제·일기)만 PATCH
      if (isEdit && editId) {
        const res = await fetch(`/api/posts/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groups: selectedGroups,
            child_reaction: selectedReaction,
            reading_amount: selectedAmount,
            topics: selectedTopics,
            is_board_book: isBoardBook,
            memo,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || '수정에 실패했습니다.')
        setSubmitSuccess('기록을 수정했어요.')
        router.push(`/posts/${editId}`)
        return
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSubmitError('로그인이 필요합니다.')
        setIsSubmitting(false)
        return
      }

      // 사진을 Storage에 업로드해 public URL 확보 (경로: {user_id}/{uuid}.{ext})
      let uploadedUrls: string[] = []
      if (photos.length > 0) {
        const results = await Promise.all(
          photos.map(async ({ file }) => {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
            const path = `${user.id}/${crypto.randomUUID()}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('post-images')
              .upload(path, file, { contentType: file.type || undefined })
            if (upErr) throw new Error('사진 업로드에 실패했습니다.')
            return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl
          })
        )
        uploadedUrls = results
      }

      const payload = {
        user_id: user.id,
        book_title: selectedBook.title,
        book_author: selectedBook.author,
        book_publisher: selectedBook.publisher,
        book_pub_date: selectedBook.pubDate,
        book_cover: selectedBook.cover,
        book_link: selectedBook.link,
        book_isbn13: selectedBook.isbn13,
        book_is_out_of_print: selectedBook.isOutOfPrint,
        groups: selectedGroups,
        child_reaction: selectedReaction,
        reading_amount: selectedAmount,
        topics: selectedTopics,
        is_board_book: isBoardBook,
        memo,
        photo_urls: uploadedUrls,
      }

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || '등록에 실패했습니다.')
      }

      setSubmitSuccess('기록을 남겼어요.')
      // 첫 기록이면 홈(피드)으로 입장, 이후 기록은 상세 페이지로
      if (isFirst) {
        router.push('/')
        return
      }
      if (data.postId) {
        router.push(`/posts/${data.postId}`)
        return
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.'
      )
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-md px-4 pb-10 pt-5">
        <header className="mb-4 flex items-center justify-between">
          {/* 첫 기록 모드에서는 홈이 다시 이 화면으로 리다이렉트되므로 링크를 숨긴다 */}
          {isFirst ? (
            <div className="w-12" />
          ) : (
            <a href="/" className="text-sm text-main">
              ← 홈으로
            </a>
          )}
          <h1 className="text-lg font-semibold">
            {isEdit ? '기록 수정' : isFirst ? '첫 책 기록하기' : '책 기록하기'}
          </h1>
          <div className="w-12" />
        </header>

        {/* 첫 기록 웰컴 배너 (11.4) */}
        {isFirst && (
          <section className="mb-4 rounded-2xl bg-main/10 p-4">
            <p className="text-sm font-semibold text-main">
              🌿 책육아정원은 기록으로 시작해요
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-text/70">
              아이와 함께 읽었던 책 한 권을 먼저 기록해주세요.
              이런 기록들이 모여 우리 아이 시기에 맞는 그림책 추천이 됩니다.
            </p>
          </section>
        )}

        {!isEdit && (
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <label htmlFor="book-search" className="mb-2 block text-sm font-medium">
            책 제목으로 검색
          </label>
          <div className="relative">
            <input
              id="book-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (selectedBook) setSelectedBook(null)
              }}
              onFocus={() => {
                if (books.length > 0) setShowDropdown(true)
              }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="예: 달님 안녕"
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-main"
            />
            {loading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                검색 중…
              </span>
            )}

            {showDropdown && books.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {books.map((book) => (
                  <li key={book.isbn13 || book.link}>
                    <button
                      type="button"
                      // blur가 click보다 먼저 발생해 선택이 취소되는 것 방지
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectBook(book)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-muted"
                    >
                      <BookCover
                        src={book.cover}
                        title={book.title}
                        size="sm"
                        className="h-14 w-10 flex-shrink-0 rounded"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">
                          {book.title}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {book.author}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          {showDropdown && !loading && books.length === 0 && query.trim().length >= 2 && (
            <p className="mt-2 text-sm text-gray-400">검색 결과가 없어요.</p>
          )}
        </section>
        )}

        {selectedBook && (
          <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
            <p className="text-xs text-gray-500">선택한 책</p>
            <div className="mt-2 flex gap-3">
              <BookCover
                src={selectedBook.cover}
                title={selectedBook.title}
                size="md"
                className="h-24 w-16 rounded-md"
              />
              <div>
                <h2 className="font-semibold">{selectedBook.title}</h2>
                <p className="text-sm text-gray-600">{selectedBook.author}</p>
                <p className="text-xs text-gray-500">
                  {selectedBook.publisher} · {selectedBook.pubDate}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-4 space-y-4 rounded-2xl bg-surface p-4 shadow-sm">
          <div>
            <p className="mb-1 text-sm font-medium">이 시기 아이가 읽으면 좋아요</p>
            <p className="mb-3 text-xs text-text/50">
              읽어주면 좋은 시기를 직접 골라주세요. 여러 개 선택할 수 있어요.
            </p>

            {/* 시기 아이콘 칩 — 6등분 그리드로 간격 균일(라벨 겹침 방지). 씨앗→어른 순서형 유지 */}
            <div className="grid grid-cols-6 gap-1">
              {RECOMMEND_GROUPS.map((group) => {
                const selected = selectedGroups.includes(group.value)
                return (
                  <button
                    key={group.value}
                    type="button"
                    onClick={() => toggleGroup(group.value)}
                    aria-pressed={selected}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-shadow ${
                        selected
                          ? `${group.selectedClass} ring-2 ring-main/60 ring-offset-1`
                          : 'bg-surface-muted'
                      }`}
                    >
                      {group.emoji}
                    </span>
                    {/* 연령 범위(개월=M, 살=Y). 그리드 등분이라 라벨이 균일하게 배치됨 */}
                    <span
                      className={`text-center text-[10px] leading-tight ${
                        selected ? 'font-semibold text-text' : 'text-text/50'
                      }`}
                    >
                      {group.ageLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              우리 아이 반응
              <button
                type="button"
                onClick={() => setShowReactionInfo((v) => !v)}
                aria-label="우리 아이 반응 안내"
                aria-expanded={showReactionInfo}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-text/30 text-[10px] text-text/50"
              >
                i
              </button>
            </p>
            {showReactionInfo && (
              <p className="mb-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-text/60">
                솔직한 반응이 다른 양육자들에게 도움이 돼요
              </p>
            )}
            <div className="flex gap-2">
              {CHILD_REACTIONS.map((reaction) => (
                <button
                  key={reaction.value}
                  type="button"
                  onClick={() => setSelectedReaction(reaction.value)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-sm ${
                    selectedReaction === reaction.value
                      ? 'bg-main text-white'
                      : 'bg-surface-muted text-text'
                  }`}
                >
                  <span className="text-lg">{reaction.emoji}</span>
                  <span className="text-xs">{reaction.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">페이지당 글밥량</p>
            <div className="grid grid-cols-2 gap-2">
              {amountOptions.map((level) => {
                const selected = selectedAmount === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedAmount(level)}
                    className={`rounded-2xl px-3 py-2 text-left text-sm ${
                      selected ? 'bg-point text-white' : 'bg-surface-accent text-text'
                    }`}
                  >
                    <span className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-4 rounded-full ${
                            i <= level
                              ? selected
                                ? 'bg-white'
                                : 'bg-main'
                              : selected
                                ? 'bg-white/30'
                                : 'bg-main/20'
                          }`}
                        />
                      ))}
                    </span>
                    <div className="mt-1.5 text-xs opacity-80">{densityHint(level)}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isBoardBook}
                onChange={(e) => setIsBoardBook(e.target.checked)}
                className="h-4 w-4 accent-main"
              />
              보드북이에요
            </label>
            <p className="mt-1 text-xs text-text/50">
              두껍고 튼튼한 보드북(조작·팝업 포함)인가요? 씨앗·새싹 시기에 유용한 정보예요.
            </p>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              주제 태그
              <button
                type="button"
                onClick={() => setShowTopicInfo((v) => !v)}
                aria-label="주제 태그 안내"
                aria-expanded={showTopicInfo}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-text/30 text-[10px] text-text/50"
              >
                i
              </button>
            </p>
            {showTopicInfo && (
              <p className="mb-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-text/60">
                주제를 선택하면 같은 주제의 책을 찾는 양육자들에게 더 잘 보여요.
              </p>
            )}

            {/* 카테고리 탭 → 하위 태그 드릴다운 (8.1) — 태그가 많아 한 카테고리씩 노출 */}
            <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {tagGroups.map((group, i) => {
                const cnt = group.tags.filter((t) => selectedTopics.includes(t)).length
                return (
                  <button
                    key={group.category}
                    type="button"
                    onClick={() => setActiveCat(i)}
                    className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                      i === activeCat ? 'bg-main text-white' : 'bg-surface-muted text-text/60'
                    }`}
                  >
                    {group.category}
                    {cnt > 0 && <span className="ml-1 opacity-90">· {cnt}</span>}
                  </button>
                )
              })}
            </div>

            {/* 선택된 카테고리의 하위 태그 */}
            <div className="flex flex-wrap gap-2">
              {tagGroups[activeCat]?.tags.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    selectedTopics.includes(topic)
                      ? 'bg-group-sprout text-text'
                      : 'bg-surface-muted text-text'
                  }`}
                >
                  #{topic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">책육아 일기</p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="읽어주기 꿀팁, 아이와 나눈 대화 등을 자유롭게 적어보세요."
              className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-main"
            />

            {!isEdit && (
            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium">참고사진 (선택 · 최대 3장)</label>
              <p className="mb-2 text-xs text-text/50">
                기록에 꼭 필요하진 않아요. 책의 한 장면 등 참고할 사진이 있으면 올려주세요.
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-main file:px-3 file:py-2 file:text-sm file:text-white"
              />
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={photo.preview} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.preview}
                        alt={`업로드 이미지 ${index + 1}`}
                        className="h-24 w-full rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        </section>

        <section className="mt-4 space-y-3">
          {submitError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{submitError}</p>
          )}
          {submitSuccess && (
            <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {submitSuccess}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-main px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isEdit
              ? isSubmitting
                ? '수정 중...'
                : '수정 완료'
              : isSubmitting
                ? '기록 중...'
                : isFirst
                  ? '첫 기록 남기고 시작하기'
                  : '기록 남기기'}
          </button>
        </section>
      </div>
    </main>
  )
}

// useSearchParams는 Suspense 경계가 필요하다 (Next.js CSR bailout)
export default function RecommendCreatePage() {
  return (
    <Suspense fallback={null}>
      <RecommendCreateInner />
    </Suspense>
  )
}
