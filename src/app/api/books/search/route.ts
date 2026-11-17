import { NextRequest, NextResponse } from 'next/server';
import { rerankBooks, type BookItem } from '@/lib/pictureBookRanking';
import { isYes24Active } from '@/lib/bookSource';

// 책 검색 — 응답 형태(items[])를 유지해 프론트·저장 로직은 무변경(어댑터 방식).
// 2026.11.17: 예스24 Open API 전환 준비. YES24_START_AT 이후 예스24, 그 전엔 카카오(lib/bookSource).
//   예스24가 점검·장애·한도 초과·응답 지연(3초)이면 그 요청은 카카오로 대신한다.
//   실패가 나면 이 서버 인스턴스는 잠시(5분, 한도 초과는 30초) 예스24를 건너뛴다.

// ---------- 공통 ----------

// "ISBN10 ISBN13" 문자열에서 ISBN13(13자리) 우선 추출, 없으면 첫 토큰 fallback
function pickIsbn13(isbn: string): string {
  const tokens = (isbn ?? '').split(/\s+/).filter(Boolean);
  return (
    tokens.find((t) => t.replace(/[^0-9Xx]/g, '').length === 13) ?? tokens[0] ?? ''
  );
}

// 바코드/ISBN 문자열 판별: 하이픈·공백 제거 후 10자리(끝 X 허용) 또는 13자리 숫자
function looksLikeIsbn(q: string): boolean {
  const s = q.replace(/[\s-]/g, '');
  return /^\d{9}[\dXx]$/.test(s) || /^\d{13}$/.test(s);
}

// '제목 1 - 부제', '제목 (양장)', '제목 2권' → '제목'
function simplifyTitle(q: string): string {
  return q
    .replace(/\s+[-–:]\s+.*$/, '') // ' - 부제', ' : 부제'
    .replace(/[([{].*?[)\]}]/g, ' ') // 괄호 안
    .replace(/\s*(제?\s*\d+\s*(권|편|부)?|[ⅠⅡⅢⅣⅤ])\s*$/, '') // 끝의 권 번호
    .replace(/\s+/g, ' ')
    .trim();
}

const hasBoardBookInTitle = (title: string) => /보드\s?북/.test(title);

// ---------- 카카오 Daum 책 검색 (https://dapi.kakao.com/v3/search/book) ----------

interface KakaoBook {
  title: string;
  contents: string;
  url: string;
  isbn: string; // "ISBN10 ISBN13" 공백 구분 (한쪽만 있을 수 있음)
  datetime: string; // ISO8601, 예: "2019-03-20T00:00:00.000+09:00"
  authors: string[];
  publisher: string;
  thumbnail: string;
  status: string; // "정상판매" / "품절" / "절판" / "주문판매" / "" 등
}

const KAKAO_ENDPOINT = 'https://dapi.kakao.com/v3/search/book';
const PAGE_SIZE = 30; // 카테고리 필터가 없어 넉넉히 받아 재정렬로 상위 노출

async function searchKakao(query: string, isIsbn: boolean): Promise<BookItem[]> {
  const key = process.env.KAKAO_CLIENT_ID; // 카카오 REST 키 (KakaoAK 헤더용)
  if (!key) throw new Error('카카오 REST 키가 설정되지 않았습니다.');
  const url = new URL(KAKAO_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('size', String(PAGE_SIZE));
  url.searchParams.set('sort', 'accuracy');
  if (isIsbn) url.searchParams.set('target', 'isbn');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  if (!res.ok) throw new Error(`카카오 책 검색 API 오류: ${res.status}`);
  const data: { documents?: KakaoBook[] } = await res.json();
  return (data.documents ?? []).map((d) => ({
    title: d.title,
    author: (d.authors ?? []).join(', '), // 카카오는 배열 → join
    publisher: d.publisher,
    pubDate: (d.datetime ?? '').slice(0, 10), // ISO8601 → YYYY-MM-DD
    cover: d.thumbnail ?? '',
    link: d.url,
    isbn13: pickIsbn13(d.isbn),
    isOutOfPrint: /절판|품절/.test(d.status ?? ''),
    description: d.contents ?? '',
    isBoardBook: hasBoardBookInTitle(d.title ?? ''),
    source: 'kakao' as const,
  }));
}

// ---------- 예스24 Open API (https://developers.yes24.com/docs) ----------
// 인증: X-Api-Key 헤더. 검색 /v1/goods/itemList(분야는 ALL·BOOK·FOREIGN… 만 — 유아 등 세부 분류 불가),
// ISBN13 상세 /v1/goods/itemDetail. detail=Y여야 판형(itemFormat)이 온다.

interface Yes24Item {
  title: string;
  author: string | null;
  goodsType: string | null; // '도서' / '외서' / 'eBook' / 음반 등
  adultYn: string | null;
  publisher: string | null;
  isbn13: string | null;
  publishDate: string | null; // '20220730' (문서 예시는 '2013-12-24')
  itemStatus: string | null; // '판매중' / '예약판매' / '품절' / '절판' …
  itemFormat: string | null; // '보드북' / '양장' / null …
  cover: string | null;
  link: string | null;
  contentDetail: { bookIntroduction: string | null } | null;
}

interface Yes24Response {
  success: boolean;
  errorCode: string | null;
  data: { items?: Yes24Item[] } | null;
}

const YES24_BASE = 'https://apis.yes24.com/v1/goods';
const YES24_TIMEOUT_MS = 3000;
const BOOK_GOODS_TYPES = new Set(['도서', '국내도서', '외서']); // eBook·음반·DVD·굿즈 제외
let yes24SkipUntil = 0; // 실패 후 잠시 건너뛰기 (이 서버 인스턴스 안에서만)

class Yes24Error extends Error {
  constructor(message: string, readonly rateLimited = false) {
    super(message);
  }
}

// 소개 HTML(<b>, <br>, &amp; …) → 평문
function plainText(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// '20220730' 또는 '2022-07-30' → '2022-07-30' (그 외는 빈 값 — books.published_date DATE 검증)
function toIsoDate(d: string | null | undefined): string {
  const s = (d ?? '').trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

async function callYes24(path: string, params: Record<string, string>): Promise<Yes24Item[]> {
  const url = new URL(`${YES24_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { 'X-Api-Key': process.env.YES24_API_KEY ?? '' },
      signal: AbortSignal.timeout(YES24_TIMEOUT_MS),
    });
  } catch (e) {
    throw new Yes24Error(`예스24 응답 없음: ${e instanceof Error ? e.message : e}`);
  }
  const data: Yes24Response | null = await res.json().catch(() => null);
  if (res.ok && data?.success) return data.data?.items ?? [];
  // 결과 없음(검색어·ISBN에 맞는 책 없음)은 실패가 아니다
  if (data?.errorCode === 'SEARCH_001' || data?.errorCode === 'GOODS_002') return [];
  throw new Yes24Error(`예스24 오류: ${res.status} ${data?.errorCode ?? ''}`, res.status === 429);
}

async function searchYes24(query: string, isIsbn: boolean): Promise<BookItem[]> {
  const isbn = query.replace(/[\s-]/g, '');
  const items =
    isIsbn && /^\d{13}$/.test(isbn)
      ? await callYes24('itemDetail', { searchType: 'ISBN13', query: isbn, detail: 'Y' })
      : await callYes24('itemList', {
          query: isIsbn ? isbn : query,
          category: 'ALL', // BOOK·FOREIGN을 따로 부르면 호출이 두 배 — 한 번에 받고 아래에서 거른다
          pageSize: String(PAGE_SIZE),
          detail: 'Y',
        });
  return items
    .filter(
      (it) =>
        it.isbn13 && // ISBN 없는 묶음·굿즈 제외
        it.adultYn !== 'Y' &&
        (!it.goodsType || BOOK_GOODS_TYPES.has(it.goodsType))
    )
    .map((it) => ({
      title: it.title,
      author: it.author ?? '',
      publisher: it.publisher ?? '',
      pubDate: toIsoDate(it.publishDate),
      cover: it.cover ?? '',
      link: it.link ?? '',
      isbn13: it.isbn13 ?? '',
      isOutOfPrint: /절판|품절/.test(it.itemStatus ?? ''),
      description: plainText(it.contentDetail?.bookIntroduction),
      // 판형 '보드북'은 믿을 수 있으나 빠진 책이 많다(실측 8권 중 3권) → 체크박스는 '미리 켜기'만
      isBoardBook: it.itemFormat === '보드북' || hasBoardBookInTitle(it.title),
      source: 'yes24' as const,
    }));
}

// 예스24 우선, 안 되면 카카오
async function searchBooks(query: string, isIsbn: boolean): Promise<BookItem[]> {
  if (isYes24Active() && Date.now() >= yes24SkipUntil) {
    try {
      return await searchYes24(query, isIsbn);
    } catch (e) {
      const rateLimited = e instanceof Yes24Error && e.rateLimited;
      yes24SkipUntil = Date.now() + (rateLimited ? 30_000 : 5 * 60_000);
      console.error('예스24 검색 실패 → 카카오로 대신:', e);
    }
  }
  return searchKakao(query, isIsbn);
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('query') ?? '';
  const query = raw.replace(/\s+/g, ' ').trim();
  if (!query) {
    return NextResponse.json({ error: '검색어(query)가 필요합니다.' }, { status: 400 });
  }

  try {
    // 바코드 스캔 등 ISBN 문자열이면 ISBN 검색, 그 외에는 통합(제목+저자) 검색.
    const isIsbn = looksLikeIsbn(query);
    let mapped = await searchBooks(query, isIsbn);
    // 결과가 없으면 권 번호·부제를 떼고 한 번 더 (2026.11.03 제보: 서점 표기 '방귀 요정 뿡뿌 1 - 복수의 독방귀'는
    // 카카오 제목 '방귀 요정 뿡뿌'와 달라 0건이었다)
    if (!isIsbn && mapped.length === 0) {
      const simpler = simplifyTitle(query);
      if (simpler && simpler !== query) mapped = await searchBooks(simpler, false);
    }

    // ISBN 정확검색은 단건 정확이라 재정렬 불필요. 제목/키워드 검색만 재정렬.
    const items = isIsbn ? mapped : rerankBooks(mapped, query);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('책 검색 API 호출 실패:', error);
    return NextResponse.json({ error: '책 검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
