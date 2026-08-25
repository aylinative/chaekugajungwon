import { NextRequest, NextResponse } from 'next/server';
import { rerankBooks, type BookItem } from '@/lib/pictureBookRanking';

// 카카오 Daum 책 검색 API (https://dapi.kakao.com/v3/search/book)
// 응답 형태(items[])를 유지해 프론트·저장 로직은 무변경(어댑터 방식).
interface KakaoBook {
  title: string;
  contents: string;
  url: string;
  isbn: string; // "ISBN10 ISBN13" 공백 구분 (한쪽만 있을 수 있음)
  datetime: string; // ISO8601, 예: "2019-03-20T00:00:00.000+09:00"
  authors: string[];
  publisher: string;
  translators: string[];
  price: number;
  sale_price: number;
  thumbnail: string;
  status: string; // "정상판매" / "품절" / "절판" / "주문판매" / "" 등
}

interface KakaoResponse {
  documents?: KakaoBook[];
  meta?: { total_count: number };
}

const KAKAO_ENDPOINT = 'https://dapi.kakao.com/v3/search/book';
const PAGE_SIZE = 30; // 카테고리 필터가 없어 넉넉히 받아 재정렬로 상위 노출 (최대 50)

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

async function searchKakao(
  query: string,
  key: string,
  target?: 'isbn'
): Promise<KakaoBook[]> {
  const url = new URL(KAKAO_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('size', String(PAGE_SIZE));
  url.searchParams.set('sort', 'accuracy');
  if (target) url.searchParams.set('target', target);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  if (!res.ok) {
    throw new Error(`카카오 책 검색 API 오류: ${res.status}`);
  }
  const data: KakaoResponse = await res.json();
  return data.documents ?? [];
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('query') ?? '';
  const query = raw.replace(/\s+/g, ' ').trim();
  if (!query) {
    return NextResponse.json({ error: '검색어(query)가 필요합니다.' }, { status: 400 });
  }

  const key = process.env.KAKAO_CLIENT_ID; // 카카오 REST 키 (KakaoAK 헤더용)
  if (!key) {
    return NextResponse.json(
      { error: '카카오 REST 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    // 바코드 스캔 등 ISBN 문자열이면 target=isbn, 그 외에는 통합(제목+저자) 검색.
    const isIsbn = looksLikeIsbn(query);
    const documents = isIsbn
      ? await searchKakao(query.replace(/[\s-]/g, ''), key, 'isbn')
      : await searchKakao(query, key);

    const mapped: BookItem[] = documents.map((d) => ({
      title: d.title,
      author: (d.authors ?? []).join(', '), // 카카오는 배열 → join
      publisher: d.publisher,
      pubDate: (d.datetime ?? '').slice(0, 10), // ISO8601 → YYYY-MM-DD (books.published_date DATE 검증 통과)
      cover: d.thumbnail ?? '',
      link: d.url,
      isbn13: pickIsbn13(d.isbn),
      isOutOfPrint: /절판|품절/.test(d.status ?? ''),
    }));

    // ISBN 정확검색은 단건 정확이라 재정렬 불필요. 제목/키워드 검색만 재정렬.
    const items = isIsbn ? mapped : rerankBooks(mapped, query);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('카카오 책 검색 API 호출 실패:', error);
    return NextResponse.json({ error: '책 검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
