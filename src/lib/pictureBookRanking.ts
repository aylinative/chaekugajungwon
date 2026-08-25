// 그림책 검색 결과 재정렬 — 카카오 결과의 카테고리 노이즈를 라우트 내부에서 정리.
// 부가기호가 없는 상업 DB 한계를 '출판사 부스트 + 문제집/세트 페널티 + 개정판 중복정리'로 보완.
// ※ 후속: PICTURE_PUBLISHERS 시드를 우리 books(서로 다른 기록 ≥2건 달린 출판사) 자동 도출로 전환하면
//   이 하드코딩 목록은 축소/제거 가능. (CLAUDE.md Deferred TODO)

export interface BookItem {
  title: string
  author: string
  publisher: string
  pubDate: string
  cover: string
  link: string
  isbn13: string
  isOutOfPrint: boolean
}

// ① 시드: 그림책/유아 강세 출판사(부분일치). 콜드스타트용.
export const PICTURE_PUBLISHERS = [
  '한림출판사', '보림', '시공주니어', '비룡소', '사계절', '웅진주니어', '웅진씽크빅', '국민서관',
  '길벗어린이', '책읽는곰', '창비', '미디어창비', '한솔수북', '더큰', '제이와이북스', 'JYBooks',
  '어스본코리아', '다산어린이', '블루래빗', '스토리보울', '문학동네어린이', '노란상상', '노란돼지',
  '천개의바람', '북극곰', '봄봄', '키즈엠', '그레이트북스', '애플비', '청어람아이', '아이세움',
  '한울림어린이', '주니어김영사', '상상의집', '소원나무', '위즈덤하우스', '계림', '예림당', '을파소',
  '삼성출판사', '풀빛', '재미마주', '키위북스', '나는별', '토토북', '현북스', '스콜라', '뜨인돌어린이',
]

// ③ 구조적 페널티: 명백한 비그림책(문제집/세트/학년). 거의 불변.
const NON_PICTURE_TITLE = /문제집|자습서|기출|모의고사|워크북|전과목|세트|전집|\d\s*학년|\d\s*-\s*\d/

const norm = (s: string) => (s ?? '').replace(/\s+/g, '').toLowerCase()
export const isPicturePublisher = (p = '') => PICTURE_PUBLISHERS.some((n) => p.includes(n))

function score(it: BookItem, nq: string): number {
  const t = norm(it.title)
  let s = 0
  if (t === nq) s += 1000 // 제목 정확 일치
  else if (t.startsWith(nq)) s += 500 // 접두 일치
  if (isPicturePublisher(it.publisher)) s += 200 // 그림책 출판사 부스트
  if (NON_PICTURE_TITLE.test(it.title ?? '')) s -= 150 // 문제집/세트 페널티
  return s
}

// 제목 중복정리: 같은 정규화 제목은 출간일 최신(=개정판) 1개만 대표.
// ⚠️ 정확히 같은 제목만 병합(부제 다른 시리즈는 유지).
function dedupNewest(items: BookItem[]): BookItem[] {
  const byTitle = new Map<string, BookItem>()
  for (const it of items) {
    const k = norm(it.title)
    const prev = byTitle.get(k)
    if (!prev || (it.pubDate || '') > (prev.pubDate || '')) byTitle.set(k, it)
  }
  return [...byTitle.values()]
}

export function rerankBooks(items: BookItem[], query: string): BookItem[] {
  const nq = norm(query)
  return dedupNewest(items)
    .map((it) => ({ it, s: score(it, nq) }))
    .sort((a, b) => b.s - a.s || (b.it.pubDate || '').localeCompare(a.it.pubDate || ''))
    .map((x) => x.it)
}
