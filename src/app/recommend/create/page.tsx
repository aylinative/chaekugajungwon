'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { RECOMMEND_GROUPS, getGroupValueByMonths } from '@/lib/groups'
import { CHILD_REACTIONS } from '@/lib/reactions'
import { getMonths, getAgeDisplay, getZodiacEmoji } from '@/lib/age'

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

const amountOptions = [
  { value: 1, label: '★☆☆☆☆', hint: '1~2단어' },
  { value: 2, label: '★★☆☆☆', hint: '1문장 내외' },
  { value: 3, label: '★★★☆☆', hint: '2~3문장' },
  { value: 4, label: '★★★★☆', hint: '여러 문장' },
  { value: 5, label: '★★★★★', hint: '글 많은 편' },
]
const topicOptions = [
  '가족',
  '친구',
  '계절',
  '명절/기념일',
  '인성/감정/회복탄력성',
  '다양성',
  '공룡',
  '동물',
  '식물',
  '곤충',
  '음식',
  '생활습관',
  '색깔',
  '잠자리독서',
  '똥/방귀',
  '말놀이/수놀이',
  '몸/신체',
  '기관',
  '탈것',
  '캐릭터',
  '보드북',
  '조작북',
  '병풍/팝업책',
]

export default function RecommendCreatePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState<BookItem[]>([])
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedReaction, setSelectedReaction] = useState<number>(2)
  const [showReactionInfo, setShowReactionInfo] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(3)
  // 시기 자동 체크용: 프로필 아이 정보 + '지금/예전' 세그먼트 (읽은 시점은 저장하지 않음 — 입력 보조 전용)
  const [children, setChildren] = useState<{ birth_date: string }[]>([])
  const [selectedChildIdx, setSelectedChildIdx] = useState(0)
  const [readingTime, setReadingTime] = useState<'now' | 'past'>('now')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const runSearch = async (keyword: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/aladin/search?query=${encodeURIComponent(keyword)}`
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
    const keyword = query.replace(/\s+/g, ' ').trim()
    // 책을 막 선택해 제목이 채워진 경우엔 재검색하지 않음
    if (selectedBook && keyword === selectedBook.title) return
    if (keyword.length < 2) {
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

  // 프로필 아이 정보 로드 (시기 자동 체크용)
  useEffect(() => {
    async function loadChildren() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('children')
        .select('birth_date')
        .eq('user_id', user.id)
        .order('birth_date', { ascending: true })
      setChildren((data as { birth_date: string }[] | null) ?? [])
    }
    loadChildren()
  }, [])

  // 시기 자동 체크 (9.2):
  // - '지금 읽고 있어요' → 선택된 아이의 현재 월령에 해당하는 칩 1개만 자동 체크
  // - '예전에 읽었어요' → 앵커 제거를 위해 전부 해제 (현재 월령은 틀린 앵커)
  // 이후 칩은 세그먼트와 무관하게 자유롭게 다중 선택·해제 가능.
  useEffect(() => {
    if (children.length === 0) return
    if (readingTime === 'past') {
      setSelectedGroups([])
      return
    }
    const child = children[selectedChildIdx] ?? children[0]
    const autoValue = getGroupValueByMonths(getMonths(child.birth_date))
    setSelectedGroups([autoValue])
  }, [children, selectedChildIdx, readingTime])

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
    const newUrls = files.map((file) => URL.createObjectURL(file))
    setPhotoUrls((current) => [...current, ...newUrls].slice(0, 3))
  }

  const removePhoto = (index: number) => {
    setPhotoUrls((current) => current.filter((_, i) => i !== index))
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
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSubmitError('로그인이 필요합니다.')
        setIsSubmitting(false)
        return
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
        memo,
        photo_urls: photoUrls,
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
      // 등록한 게시물 상세 페이지로 이동
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
          <a href="/" className="text-sm text-main">
            ← 홈으로
          </a>
          <h1 className="text-lg font-semibold">책 기록하기</h1>
          <div className="w-12" />
        </header>

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
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="h-14 w-10 flex-shrink-0 rounded object-cover"
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

        {selectedBook && (
          <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
            <p className="text-xs text-gray-500">선택한 책</p>
            <div className="mt-2 flex gap-3">
              <img
                src={selectedBook.cover}
                alt={selectedBook.title}
                className="h-24 w-16 rounded-md object-cover"
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
            <p className="mb-2 text-sm font-medium">이 시기 아이가 읽으면 좋아요</p>

            {/* 아이 칩들 ㅣ '예전에 읽었어요' — 한 줄로 두 갈래 구분.
                아이 칩 = 그 아이의 현재 월령 기준 자동 체크(기본) / 예전에 = 자동 체크 해제 */}
            {children.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {children.map((child, idx) => {
                  const year = new Date(child.birth_date).getFullYear()
                  const active = readingTime === 'now' && selectedChildIdx === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedChildIdx(idx)
                        setReadingTime('now')
                      }}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                        active
                          ? 'bg-main font-medium text-white'
                          : 'bg-surface-muted text-text/60'
                      }`}
                    >
                      <span>{getZodiacEmoji(year)}</span>
                      {getAgeDisplay(child.birth_date)}
                    </button>
                  )
                })}
                <span className="h-4 w-px bg-text/15" aria-hidden />
                <button
                  type="button"
                  onClick={() =>
                    setReadingTime((t) => (t === 'past' ? 'now' : 'past'))
                  }
                  aria-pressed={readingTime === 'past'}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    readingTime === 'past'
                      ? 'bg-main font-medium text-white'
                      : 'bg-surface-muted text-text/60'
                  }`}
                >
                  예전에 읽었어요
                </button>
              </div>
            )}

            {/* 시기 아이콘 칩 — 원형 이모지 + 연령 범위, 한 줄 6개 */}
            <div className="flex justify-between">
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
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition-shadow ${
                        selected
                          ? `${group.selectedClass} ring-2 ring-main/60 ring-offset-1`
                          : 'bg-surface-muted'
                      }`}
                    >
                      {group.emoji}
                    </span>
                    {/* 시기명 대신 연령 범위 표기 — 사용자는 시기 이름의 기준을 모른다 */}
                    <span
                      className={`text-[10px] leading-tight ${
                        selected ? 'font-semibold text-text' : 'text-text/50'
                      }`}
                    >
                      {group.ageLabel}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* '예전에 읽었어요'일 때만 노출되는 힌트 */}
            {children.length > 0 && readingTime === 'past' && (
              <p className="mt-1.5 text-xs text-text/50">그때 시기를 골라주세요</p>
            )}
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
            <p className="mb-2 text-sm font-medium">페이지당 평균 글밥량</p>
            <div className="grid grid-cols-2 gap-2">
              {amountOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedAmount(option.value)}
                  className={`rounded-2xl px-3 py-2 text-left text-sm ${
                    selectedAmount === option.value
                      ? 'bg-point text-white'
                      : 'bg-surface-accent text-text'
                  }`}
                >
                  <div>{option.label}</div>
                  <div className="mt-1 text-xs opacity-80">{option.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">주제 태그</p>
            <div className="flex flex-wrap gap-2">
              {topicOptions.map((topic) => (
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

            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium">사진 업로드 (최대 3장)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-main file:px-3 file:py-2 file:text-sm file:text-white"
              />
              {photoUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photoUrls.map((url, index) => (
                    <div key={url} className="relative">
                      <img
                        src={url}
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
            {isSubmitting ? '기록 중...' : '기록 남기기'}
          </button>
        </section>
      </div>
    </main>
  )
}
