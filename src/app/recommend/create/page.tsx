'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { RECOMMEND_GROUPS } from '@/lib/groups'
import { CHILD_REACTIONS } from '@/lib/reactions'
import { densityHint } from '@/lib/density'
import type { TopicPick, TaxonomyData } from '@/lib/topics'
import TopicPicker from '@/components/record/TopicPicker'
import BarcodeScanner, { CameraIcon } from '@/components/record/BarcodeScanner'
import BookCover from '@/components/BookCover'
import BottomTabBar from '@/components/BottomTabBar'
import { setLeaveGuard, confirmLeave } from '@/lib/leaveGuard'
import { rotateImage } from '@/lib/photoRotate'
import { todayKST } from '@/lib/age'
import { formatYmd } from '@/lib/date'

interface BookItem {
  title: string
  author: string
  publisher: string
  pubDate: string
  cover: string
  link: string
  isbn13: string
  isOutOfPrint: boolean
  description?: string // 책 소개 — 주제 추천 매칭용 + 책에 저장(책 페이지 소개) (수정 화면에서는 없음)
  isBoardBook?: boolean // 판형·제목으로 본 보드북 여부 — 체크 미리 켜기용
}

// 글밥량 = 페이지당 글 양(중립 속성). 별점 연상을 피해 게이지+부연으로 표시.
const amountOptions = [0, 1, 2, 3, 4, 5] // 0 = 글 없는 그림책(바 채움 없음)
// 시기 라벨('씨앗')→폼 값('seed') 역매핑 — 편집 모드에서 기존 post_groups 프리필용
const GROUP_LABEL_TO_VALUE: Record<string, string> = Object.fromEntries(
  RECOMMEND_GROUPS.map((g) => [g.label, g.value])
)

const PHOTO_MAX = 3
type PhotoItem = { key: string; url: string; file?: File; existing?: boolean; rotation: number }
const newPhoto = (file: File): PhotoItem => ({ key: crypto.randomUUID(), url: URL.createObjectURL(file), file, rotation: 0 })

function RecommendCreateInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 편집 모드(?edit=<postId>): 내 기록 수정. 책은 고정, 시기·반응·글밥량·주제·일기만 편집.
  const editId = searchParams.get('edit')
  const isEdit = Boolean(editId)
  // 검색 화면 '첫 기록 남기기'에서 넘어오면 책 제목이 미리 채워진다 → 진입 즉시 자동 검색
  const [query, setQuery] = useState(() => searchParams.get('query') ?? '')
  const [books, setBooks] = useState<BookItem[]>([])
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null)
  // 편집 모드에서 책을 다시 검색·교체할 수 있게 하는 토글. '취소' 시 initialBook으로 복원.
  const [changingBook, setChangingBook] = useState(false)
  const [initialBook, setInitialBook] = useState<BookItem | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [scanOpen, setScanOpen] = useState(false) // 바코드 스캔 화면
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedReaction, setSelectedReaction] = useState<number | null>(null)
  const [showReactionInfo, setShowReactionInfo] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  // 주제 태그(2026.10 개편): 고른 주제·세부 slug + 고른 경로(source)
  const [topicPicks, setTopicPicks] = useState<TopicPick[]>([])
  const [taxonomy, setTaxonomy] = useState<TaxonomyData | null>(null)
  const [isBoardBook, setIsBoardBook] = useState(false) // 보드북 여부(책 속성)
  const [memo, setMemo] = useState('')
  // 책육아 일기 날짜 — 기본 오늘(KST), 바꿀 수 있음. 마이 캘린더가 이 날짜 기준 (2026.11.17)
  const [diaryDate, setDiaryDate] = useState(() => todayKST())
  // 참고사진 (2026.11.06 — 새 기록·수정 모두에서 추가·촬영·회전·교체·삭제).
  // 새 사진은 File + blob 미리보기, 이미 올린 사진은 public URL. 회전은 화면에선 CSS로, 저장할 때 실제로 돌려 다시 올린다.
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [submitError, setSubmitError] = useState('')
  const [editLoaded, setEditLoaded] = useState(false) // 수정 모드: 기존 기록 프리필 완료
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
    // 편집 모드에서는 기본적으로 책 고정. '책 변경'을 눌러 changingBook=true일 때만 검색.
    if (isEdit && !changingBook) return
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

  // 바코드로 읽은 ISBN13 → 카카오 ISBN 검색(이미 있는 target=isbn 분기). 1권이면 바로 선택, 여러 권이면 목록, 없으면 안내.
  const handleBarcode = async (isbn: string) => {
    setScanOpen(false)
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/search?query=${encodeURIComponent(isbn)}`)
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '검색에 실패했습니다.')
      const items: BookItem[] = data.items || []
      if (items.length === 1) selectBook(items[0])
      else if (items.length > 1) {
        setBooks(items)
        setShowDropdown(true)
      } else setError(`바코드(${isbn})로 책을 찾지 못했어요. 책 제목으로 검색해 주세요.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const selectBook = (book: BookItem) => {
    setSelectedBook(book)
    setQuery(book.title)
    setShowDropdown(false)
    setBooks([])
    setChangingBook(false) // 새 책을 골랐으면 변경 모드 종료(편집 모드에서만 의미 있음)
    // 판형이 '보드북'이거나 제목에 '보드북'이면 체크를 미리 켠다 — 확인만 하고 틀리면 끄면 된다 (2026.11.17)
    // (판형 정보가 빠진 보드북이 많아 자동 판정으로 체크박스를 대신하지는 않는다)
    if (book.isBoardBook) setIsBoardBook(true)
  }

  // 로그인 가드: 이 페이지는 클라이언트 컴포넌트라 서버 인증을 거치지 않는다.
  // 세션 없는 브라우저에서 URL로 직접 진입하면(예: 링크 공유) 폼이 그대로 떠서
  // 저장 시점에야 '로그인이 필요합니다'만 뜨고 로그인 수단이 없었다 → 홈(로그인 화면)으로 보낸다.
  const [authChecked, setAuthChecked] = useState(false)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  // 첫 기록 안내 레이어 (2026.11.05 운영자): 기록 0건인 사람이 들어올 때마다(경로 무관) 띄우고, 닫을 수 있다.
  // 예전 '첫 기록 모드'(?first=1) 화면은 없앰 — 기록하기 화면은 하나, 안내는 기록 수로만 판단.
  const [showFirstGuide, setShowFirstGuide] = useState(false)
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        // 홈 피드 + 로그인 시트('기록을 남기려면…'), 로그인하면 이 화면으로 돌아온다 (2026.11.04)
        router.replace(`/?login=record&next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        return
      }
      setMyUserId(user.id)
      if (!editId) {
        const { count } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('hidden_at', null)
        setShowFirstGuide((count ?? 0) === 0)
      }
      setAuthChecked(true)
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 주제 목록(큰 분류·주제·세부·매칭어 + 자주 쓰는 주제)을 화면을 열 때 한 번만 불러옴 (하루 캐시 API)
  useEffect(() => {
    fetch('/api/topics')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TaxonomyData | null) => d && Array.isArray(d.tags) && setTaxonomy(d))
      .catch(() => {})
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
          `id, user_id, child_reaction, text_density, content, diary_date,
           book:books ( title, author, publisher, published_date, cover_image_url, source_url, book_key, is_out_of_print, is_board_book ),
           post_groups ( group_name ),
           post_tags ( operator_tags ( slug, is_active ) ),
           post_images ( image_url, sort_order )`
        )
        .eq('id', editId)
        .is('hidden_at', null)
        .maybeSingle()

      const row = data as unknown as {
        user_id: string
        child_reaction: number | null
        text_density: number | null
        content: string | null
        diary_date: string | null
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
        post_tags: { operator_tags: { slug: string | null; is_active: boolean } | null }[] | null
        post_images: { image_url: string; sort_order: number | null }[] | null
      } | null

      if (!row || row.user_id !== user.id) {
        router.push('/') // 없거나 내 기록이 아니면 접근 불가
        return
      }

      const b = row.book
      if (b) {
        const book: BookItem = {
          title: b.title ?? '',
          author: b.author ?? '',
          publisher: b.publisher ?? '',
          pubDate: b.published_date ?? '',
          cover: b.cover_image_url ?? '',
          link: b.source_url ?? '',
          isbn13: b.book_key ?? '',
          isOutOfPrint: Boolean(b.is_out_of_print),
        }
        setSelectedBook(book)
        setInitialBook(book) // '취소' 시 복원용 원본
        setQuery(b.title ?? '')
        setIsBoardBook(Boolean(b.is_board_book))
      }
      setSelectedGroups(
        (row.post_groups ?? [])
          .map((g) => GROUP_LABEL_TO_VALUE[g.group_name])
          .filter((v): v is string => Boolean(v))
      )
      if (row.child_reaction != null) setSelectedReaction(row.child_reaction)
      if (row.text_density != null) setSelectedAmount(row.text_density) // 0(글 없는 그림책)도 프리필
      // 활성 태그만 불러옴. 숨김 처리된 옛 태그는 화면에 없고, 서버가 그대로 보존한다.
      setTopicPicks(
        (row.post_tags ?? [])
          .map((t) => (t.operator_tags?.is_active ? t.operator_tags.slug : null))
          .filter((v): v is string => Boolean(v))
          .map((slug) => ({ slug, source: 'existing' as const }))
      )
      setMemo(row.content ?? '')
      if (row.diary_date) setDiaryDate(row.diary_date)
      setPhotos(
        [...(row.post_images ?? [])]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((p) => ({ key: p.image_url, url: p.image_url, existing: true, rotation: 0 }))
      )
      setEditLoaded(true) // 이 시점 상태가 '수정 전' 기준(이탈 확인용)
    }
    loadPost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  // 작성 중 이탈 확인 (lib/leaveGuard) — 입력한 게 있을 때만 묻는다.
  // 새 기록: 책·반응·글밥량·주제·보드북·일기·사진 중 하나라도 있으면(시기는 자동 체크라 제외).
  // 수정: 불러온 직후 상태와 달라졌으면.
  const formSnapshot = JSON.stringify({
    b: selectedBook ? selectedBook.isbn13 || selectedBook.title : null,
    g: [...selectedGroups].sort(),
    r: selectedReaction,
    a: selectedAmount,
    t: topicPicks,
    bb: isBoardBook,
    m: memo,
    dd: diaryDate,
    p: photos.map((p) => `${p.key}:${p.rotation}`),
  })
  const [editBaseline, setEditBaseline] = useState<string | null>(null)
  if (editLoaded && editBaseline === null) setEditBaseline(formSnapshot) // 불러온 직후 1회(렌더 중 갱신 패턴)
  const isDirty = isEdit
    ? editBaseline !== null && formSnapshot !== editBaseline
    : Boolean(selectedBook) ||
      selectedReaction !== null ||
      selectedAmount !== null ||
      topicPicks.length > 0 ||
      isBoardBook ||
      memo.trim() !== '' ||
      diaryDate !== todayKST() ||
      photos.length > 0
  useEffect(() => {
    if (!isDirty) return
    setLeaveGuard(isEdit ? '수정한 내용이 저장되지 않아요. 나갈까요?' : '작성 중인 기록이 사라져요. 나갈까요?')
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      setLeaveGuard(null)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [isDirty, isEdit])

  const toggleGroup = (groupValue: string) => {
    setSelectedGroups((current) =>
      current.includes(groupValue)
        ? current.filter((item) => item !== groupValue)
        : [...current, groupValue]
    )
  }

  // 촬영·파일 선택으로 추가 (교체 중이면 그 자리 사진을 바꾼다)
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = '' // 같은 파일 다시 선택 가능하도록 초기화
    if (files.length === 0) return
    if (replaceIndex !== null) {
      const idx = replaceIndex
      setReplaceIndex(null)
      setPhotos((current) => {
        const old = current[idx]
        if (old?.file) URL.revokeObjectURL(old.url)
        return current.map((p, i) => (i === idx ? newPhoto(files[0]) : p))
      })
      return
    }
    setPhotos((current) => [...current, ...files.map(newPhoto)].slice(0, PHOTO_MAX))
  }

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      const target = current[index]
      if (target?.file) URL.revokeObjectURL(target.url)
      return current.filter((_, i) => i !== index)
    })
  }

  const rotatePhoto = (index: number) =>
    setPhotos((current) => current.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p)))

  // 저장 직전: 새 사진·돌린 사진을 Storage(내 폴더)에 올리고, 바뀌지 않은 기존 사진은 URL 그대로 → 최종 URL 목록
  const uploadPhotos = async (userId: string): Promise<string[]> => {
    const supabase = createClient()
    return Promise.all(
      photos.map(async (p) => {
        if (p.existing && p.rotation === 0) return p.url
        const blob: Blob = p.rotation !== 0 ? await rotateImage(p.file ?? p.url, p.rotation) : p.file!
        const ext = p.rotation !== 0 ? 'jpg' : p.file?.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${userId}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('post-images')
          .upload(path, blob, { contentType: blob.type || undefined })
        if (upErr) throw new Error('사진 업로드에 실패했습니다.')
        return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl
      })
    )
  }

  // 이미 기록한 책인지 — 책을 고르는 즉시 확인해 안내 (한 사람당 책 1기록, 저장 API도 409로 막음. 2026.11.04 운영자)
  // 책 식별자는 저장 API와 같은 규칙(ISBN13 → 링크 → 제목). 수정 중인 기록 자신은 제외.
  const selectedKey = selectedBook ? selectedBook.isbn13 || selectedBook.link || selectedBook.title : null
  const [duplicate, setDuplicate] = useState<{ key: string; postId: string } | null>(null)
  useEffect(() => {
    if (!selectedKey || !myUserId) return
    let alive = true
    let q = createClient()
      .from('posts')
      .select('id, books!inner(book_key)')
      .eq('user_id', myUserId)
      .eq('books.book_key', selectedKey)
      .is('hidden_at', null)
      .limit(1)
    if (editId) q = q.neq('id', editId)
    q.then(({ data }) => {
      if (!alive) return
      const id = (data as { id: string }[] | null)?.[0]?.id
      setDuplicate(id ? { key: selectedKey, postId: id } : null)
    })
    return () => {
      alive = false
    }
  }, [selectedKey, myUserId, editId])
  const duplicatePostId = duplicate && duplicate.key === selectedKey ? duplicate.postId : null

  // 이 책에 '나도 추천해요'로 고른 시기가 있으면 시기 칩에 그대로 체크 (2026.11.06 운영자 — 안내 문구 없이 체크만).
  // 내가 이미 한 판단이라 프리셋 금지(10.3, 남의 판단 앵커링 방지)와 무관. 이미 고른 시기가 있으면 건드리지 않음. 새 기록에서만.
  useEffect(() => {
    if (!selectedKey || !myUserId || editId) return
    let alive = true
    createClient()
      .from('likes')
      .select('group_names, books!inner(book_key)')
      .eq('user_id', myUserId)
      .eq('books.book_key', selectedKey)
      .limit(1)
      .then(({ data }) => {
        const labels = (data as { group_names: string[] | null }[] | null)?.[0]?.group_names ?? []
        const values = labels.map((l) => GROUP_LABEL_TO_VALUE[l]).filter(Boolean)
        if (alive && values.length) setSelectedGroups((current) => (current.length ? current : values))
      })
    return () => {
      alive = false
    }
  }, [selectedKey, myUserId, editId])

  const handleSubmit = async () => {
    if (!selectedBook) {
      setSubmitError('책을 먼저 선택해주세요.')
      return
    }

    if (duplicatePostId) {
      setSubmitError('이미 기록한 책이에요. 기존 기록을 수정해 주세요.')
      return
    }

    if (selectedGroups.length === 0) {
      setSubmitError('읽어주면 좋은 시기를 하나 이상 골라주세요.')
      return
    }

    if (selectedReaction === null) {
      setSubmitError('우리 아이 반응을 선택해주세요.')
      return
    }

    if (selectedAmount === null) {
      setSubmitError('페이지당 글밥량을 선택해주세요.')
      return
    }

    if (!memo.trim()) {
      setSubmitError('책육아 일기를 입력해주세요.')
      return
    }

    if (taxonomy?.preview) {
      setSubmitError('개발용 미리보기에서는 저장할 수 없어요 (DB 개편 전).')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      // 편집 모드: 속성(시기·반응·글밥량·주제·일기) + 선택한 책을 PATCH.
      // 책을 바꾸면 백엔드가 book을 찾거나 새로 만들어 posts.book_id를 갱신한다. 사진은 그대로.
      if (isEdit && editId) {
        // 참고사진 최종 목록(새·돌린 사진은 먼저 업로드)
        const editPhotoUrls = myUserId ? await uploadPhotos(myUserId) : undefined
        const res = await fetch(`/api/posts/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book_title: selectedBook.title,
            book_author: selectedBook.author,
            book_publisher: selectedBook.publisher,
            book_pub_date: selectedBook.pubDate,
            book_cover: selectedBook.cover,
            book_link: selectedBook.link,
            book_isbn13: selectedBook.isbn13,
            book_is_out_of_print: selectedBook.isOutOfPrint,
            book_description: selectedBook.description,
            groups: selectedGroups,
            child_reaction: selectedReaction,
            reading_amount: selectedAmount,
            tags: topicPicks.map((p) => ({ slug: p.slug, source: p.source })),
            is_board_book: isBoardBook,
            memo,
            diary_date: diaryDate,
            photo_urls: editPhotoUrls,
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

      // 사진을 Storage에 업로드해 public URL 확보 (경로: {user_id}/{uuid}.{ext}, 돌린 사진은 실제로 돌려서)
      const uploadedUrls = photos.length > 0 ? await uploadPhotos(user.id) : []

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
        book_description: selectedBook.description,
        groups: selectedGroups,
        child_reaction: selectedReaction,
        reading_amount: selectedAmount,
        tags: topicPicks.map((p) => ({ slug: p.slug, source: p.source })),
        is_board_book: isBoardBook,
        memo,
        diary_date: diaryDate,
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
      // 첫 기록이든 아니든 방금 쓴 기록 상세로 (2026.11.05)
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

  // 로그인 확인 전에는 폼을 그리지 않는다 (비로그인 진입 시 폼 깜빡임·오작동 방지)
  if (!authChecked) {
    return <main className="min-h-screen bg-bg" />
  }


  return (
    <main className="flex min-h-screen flex-col bg-bg text-text">
      {/* 다른 화면과 같은 상단 고정 헤더 — 아이폰 앱에서 시계와 겹치지 않게 pt-safe-3 (2026.11.13) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-bg/90 px-4 pb-3 pt-safe-3 backdrop-blur">
        {/* 새 기록: 왼쪽 버튼 없음(홈은 하단 탭 바). 수정: 들어온 화면으로 돌아가기 —
            iOS 앱은 뒤로 가기 제스처가 없어 버튼이 필요. 바로 열린 경우(기록 없음)엔 그 기록 상세로. */}
        {isEdit ? (
          <button
            type="button"
            onClick={() => {
              if (!confirmLeave()) return
              if (window.history.length > 1) router.back()
              else router.push(`/posts/${editId}`)
            }}
            className="w-16 py-1 text-left text-sm text-main"
          >
            ‹ 뒤로
          </button>
        ) : (
          <div className="w-16" />
        )}
        <h1 className="text-base font-semibold">
          {isEdit ? '기록 수정' : '책 기록하기'}
        </h1>
        <div className="w-16" />
      </header>
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4">

        {/* 첫 기록 안내 레이어 — 기록 0건일 때만, 닫으면 아래 기록하기 화면 그대로 */}
        {showFirstGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" role="dialog" aria-modal="true" aria-label="첫 기록 안내">
            <div className="w-full max-w-sm rounded-3xl bg-surface p-6 text-center shadow-lg">
              <p className="text-base font-semibold text-main">🌿 책육아정원은 기록으로 시작해요</p>
              <p className="mt-3 break-keep text-sm leading-relaxed text-text/70">
                아이와 함께 읽었던 책 한 권을 먼저 기록해주세요.
                이런 기록들이 모여 우리 아이 시기에 맞는 그림책 추천이 됩니다.
              </p>
              <button
                type="button"
                onClick={() => setShowFirstGuide(false)}
                className="mt-5 w-full rounded-2xl bg-main py-3 text-sm font-semibold text-white"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {(!isEdit || changingBook) && (
        <section className={`rounded-2xl bg-surface p-4 shadow-sm ${isEdit ? 'mt-4' : ''}`}>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="book-search" className="block text-sm font-medium">
              {changingBook ? '다른 책으로 바꾸기' : '책 검색'}
              {/* 단행본 지향 안내 (2026.11.04 운영자) — 검색 자체는 모든 책이 나오므로 '기록해요'로 안내 */}
              <span className="ml-1 text-xs font-normal text-text/45">(전집 말고 단행본 그림책을 기록해요)</span>
            </label>
            {/* 변경 취소 → 원래 고른 책으로 복원 */}
            {changingBook && initialBook && (
              <button
                type="button"
                onClick={() => {
                  setChangingBook(false)
                  setSelectedBook(initialBook)
                  setQuery(initialBook.title)
                  setBooks([])
                  setShowDropdown(false)
                }}
                className="text-xs font-medium text-text/50"
              >
                취소
              </button>
            )}
          </div>
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
              placeholder="제목, 작가, ISBN으로 검색"
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 py-2 pl-3 pr-12 text-sm outline-none focus:border-main"
            />
            {loading ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                검색 중…
              </span>
            ) : (
              // 바코드 스캔 (2026.10.30) — 카메라를 쓸 수 있는 브라우저에서만
              typeof navigator !== 'undefined' &&
              typeof navigator.mediaDevices?.getUserMedia === 'function' && (
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  aria-label="카메라로 바코드 찍어 찾기"
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-text/60"
                >
                  <CameraIcon />
                </button>
              )
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
          {scanOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanOpen(false)} />}
          {showDropdown && !loading && books.length === 0 && query.trim().length >= 2 && (
            <p className="mt-2 text-sm text-gray-400">검색 결과가 없어요.</p>
          )}
        </section>
        )}

        {selectedBook && !changingBook && (
          <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">선택한 책</p>
              {/* 편집 모드: 잘못 고른 책을 다른 책으로 교체할 수 있게 한다 */}
              {isEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setChangingBook(true)
                    setQuery('')
                    setBooks([])
                  }}
                  className="text-xs font-medium text-main"
                >
                  책 변경
                </button>
              )}
              {/* 새 기록: 잘못 고른 책을 지우고 다시 검색 (2026.11.03) */}
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBook(null)
                    setQuery('')
                    setBooks([])
                    document.getElementById('book-search')?.focus()
                  }}
                  aria-label="선택한 책 지우기"
                  className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-text/40 hover:bg-surface-muted"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
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
            {duplicatePostId && (
              <div className="mt-3 rounded-xl bg-point/10 px-3 py-2.5 text-xs text-text/80">
                <p className="font-medium">이미 기록한 책이에요.</p>
                <p className="mt-0.5 text-text/60">다시 읽은 이야기는 기존 기록을 수정해서 더해 주세요.</p>
                <div className="mt-2 flex gap-3">
                  <a href={`/recommend/create?edit=${duplicatePostId}`} className="font-medium text-main underline underline-offset-2">
                    기존 기록 수정하기
                  </a>
                  <a href={`/posts/${duplicatePostId}`} className="text-text/50 underline underline-offset-2">
                    기록 보기
                  </a>
                </div>
              </div>
            )}
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
                      className={`text-center text-[9px] leading-tight tracking-tight ${
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

          <TopicPicker
            taxonomy={taxonomy}
            picks={topicPicks}
            onChange={setTopicPicks}
            bookTitle={selectedBook?.title ?? ''}
            bookDescription={selectedBook?.description ?? ''}
            bookNames={selectedBook ? [selectedBook.publisher, ...selectedBook.author.split(',')] : []}
            bookKey={selectedBook ? selectedBook.isbn13 || selectedBook.link || selectedBook.title : null}
          />

          <div>
            {/* 제목 줄 오른쪽 = 일기 날짜(기본 오늘, 눌러서 휴대폰 날짜 선택기). 그날 아이 나이는 표시 안 함(2026.11.19 운영자) */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">책육아 일기</p>
              <label className="relative flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-xs text-text/70">
                📅 {formatYmd(diaryDate)}
                {diaryDate === todayKST() && <span className="text-text/40">(오늘)</span>}
                <span className="text-text/40">›</span>
                <input
                  type="date"
                  value={diaryDate}
                  max={todayKST()}
                  min="2000-01-01"
                  onChange={(e) => e.target.value && setDiaryDate(e.target.value)}
                  aria-label="일기 날짜"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="읽어주기 꿀팁, 아이와 나눈 대화 등을 자유롭게 적어보세요."
              className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-main"
            />

            {/* 참고사진 — 새 기록·수정 모두 (2026.11.06): 촬영/파일 선택으로 추가, 사진마다 회전·교체·삭제 */}
            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium">참고사진 (선택 · 최대 {PHOTO_MAX}장)</label>
              <p className="mb-2 text-xs text-text/50">
                기록에 꼭 필요하진 않아요. 책의 한 장면 등 참고할 사진이 있으면 올려주세요.
              </p>
              {/* 숨긴 입력: 촬영(카메라 바로 열기) / 파일 선택(여러 장) / 교체(한 장) */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              <input ref={replaceInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              {photos.length < PHOTO_MAX && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceIndex(null)
                      cameraInputRef.current?.click()
                    }}
                    className="flex-1 rounded-xl bg-main px-3 py-2 text-sm text-white"
                  >
                    📷 촬영
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceIndex(null)
                      fileInputRef.current?.click()
                    }}
                    className="flex-1 rounded-xl border border-main/40 px-3 py-2 text-sm text-main"
                  >
                    🖼 사진 선택
                  </button>
                </div>
              )}
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={photo.key}>
                      <div className="relative h-24 w-full overflow-hidden rounded-xl bg-surface-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`참고사진 ${index + 1}`}
                          style={{ transform: `rotate(${photo.rotation}deg)` }}
                          className="h-full w-full object-contain transition-transform"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          aria-label="사진 삭제"
                          className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-1 flex justify-center gap-3 text-[11px] text-text/60">
                        <button type="button" onClick={() => rotatePhoto(index)} className="underline-offset-2 hover:underline">
                          ↻ 회전
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceIndex(index)
                            replaceInputRef.current?.click()
                          }}
                          className="underline-offset-2 hover:underline"
                        >
                          교체
                        </button>
                      </div>
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
            {isEdit
              ? isSubmitting
                ? '수정 중...'
                : '수정 완료'
              : isSubmitting
                ? '기록 중...'
                : '기록 남기기'}
          </button>
        </section>
      </div>
      <BottomTabBar />
    </main>
  )
}

// 수정(?edit=)↔새 기록 사이를 오가면 폼을 새로 만든다 — 수정 화면에서 하단 '기록하기' 탭을 누르면
// 같은 화면이 재사용돼, 옛 기록 내용이 남은 '새 기록' 폼으로 저장(중복 기록)되는 것을 막는다.
function RecommendCreateKeyed() {
  const editId = useSearchParams().get('edit')
  return <RecommendCreateInner key={editId ?? 'new'} />
}

// useSearchParams는 Suspense 경계가 필요하다 (Next.js CSR bailout)
export default function RecommendCreatePage() {
  return (
    <Suspense fallback={null}>
      <RecommendCreateKeyed />
    </Suspense>
  )
}
