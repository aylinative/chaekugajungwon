// 책 페이지 좌우 넘기기용 목록 (2026.11.14) — 홈 시기 섹션·시기 더보기에서 표지를 누를 때,
// 그 순간 화면에 보이던 순서(정렬·주제 필터 그대로)를 저장한다. 책 페이지는 주소에 ?nav=1이 있을 때만 이 목록으로 넘긴다
// (검색·공유 링크·마이페이지로 들어오면 넘기기 없음). 브라우저 탭 단위(sessionStorage), 실패해도 넘기기만 안 될 뿐.

const KEY = 'bookNav'
export const BOOK_NAV_PARAM = 'nav'

export function saveBookNav(isbns: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(isbns))
  } catch {}
}

export function readBookNav(): string[] | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    return Array.isArray(v) ? (v as string[]) : null
  } catch {
    return null
  }
}

export function bookNavHref(isbn: string) {
  return `/book/${encodeURIComponent(isbn)}?${BOOK_NAV_PARAM}=1`
}
