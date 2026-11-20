// 통합한 책 — 옛 ISBN → 남긴 ISBN (2026.11.20~). 같은 책이 판·표기만 달라 따로 쌓였던 것을 하나로 합친 목록.
// 옛 ISBN은 책 검색(기록하기·담기 시트·검색 화면 공용 /api/books/search)에 나오지 않게 하고(헷갈림·같은 책 재생성 방지),
// 옛 판 바코드를 찍으면 남긴 책으로 찾아 준다. 통합은 data 탭이 DB에서 하고, 여기에 한 줄 추가한다.
export const MERGED_BOOKS: Record<string, string> = {
  '9788943306090': '9788943302344', // 사과가 쿵! (보림 2009-06-20) → 사과가 쿵 (보림 2009-08-31)
}

export function mergedTarget(isbn: string): string | undefined {
  return MERGED_BOOKS[isbn.replace(/[\s-]/g, '')]
}
