import { NextRequest, NextResponse } from 'next/server';

// 알라딘 API 응답 타입 정의
interface AladinItem {
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  link: string;
  isbn13: string;
  stockstatus: string;
  mallType: string; // BOOK(국내도서) / FOREIGN(외국도서) / EBOOK / DVD / MUSIC / USED
}

interface AladinResponse {
  item?: AladinItem[];
  totalResults?: number;
  errorCode?: string;
  errorMessage?: string;
}

// 그림책 위주로 좁히기 위한 알라딘 카테고리(CID) 목록.
// ItemSearch는 CategoryId를 하나만 받으므로 CID별로 호출 후 합쳐서 중복 제거한다.
// 필요 시 여기에 CID를 추가하면 검색 범위가 넓어진다.
//  1108 = 국내도서>유아>4~7세>그림책
//  13789 = 국내도서>유아>0~3세>그림책
//  2030, 106165 = 추가 그림책 분류
const CATEGORY_IDS = [1108, 13789, 2030, 106165];
const MAX_RESULTS_PER_CATEGORY = 30;

async function searchByCategory(
  query: string,
  ttbKey: string,
  categoryId: number
): Promise<AladinItem[]> {
  const url = new URL('http://www.aladin.co.kr/ttb/api/ItemSearch.aspx');
  url.searchParams.set('ttbkey', ttbKey);
  url.searchParams.set('Query', query);
  url.searchParams.set('QueryType', 'Title'); // 제목 검색
  url.searchParams.set('SearchTarget', 'Book'); // CategoryId가 국내도서 트리 기준
  url.searchParams.set('CategoryId', String(categoryId));
  url.searchParams.set('MaxResults', String(MAX_RESULTS_PER_CATEGORY));
  url.searchParams.set('start', '1');
  url.searchParams.set('Cover', 'Mid');
  url.searchParams.set('Output', 'JS');
  url.searchParams.set('Version', '20131101');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`알라딘 API 오류: ${response.status}`);
  }
  const data: AladinResponse = await response.json();
  if (data.errorCode || !data.item) {
    return [];
  }
  return data.item;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get('query') ?? '';
  const query = rawQuery.replace(/\s+/g, ' ').trim();

  // 검색어 없으면 에러 응답
  if (!query) {
    return NextResponse.json(
      { error: '검색어(query)가 필요합니다.' },
      { status: 400 }
    );
  }

  const ttbKey = process.env.ALADIN_TTB_KEY;

  if (!ttbKey) {
    return NextResponse.json(
      { error: 'TTB Key가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    // 지정된 CID들을 병렬 호출. 개별 카테고리 실패는 무시하고 나머지로 진행.
    const perCategory = await Promise.all(
      CATEGORY_IDS.map((cid) =>
        searchByCategory(query, ttbKey, cid).catch((error) => {
          console.error(`알라딘 CID=${cid} 호출 실패:`, error);
          return [] as AladinItem[];
        })
      )
    );

    // 카테고리 순서대로 합치고 isbn13(없으면 link) 기준으로 중복 제거.
    const seen = new Set<string>();
    const items = perCategory
      .flat()
      .filter((item) => item.mallType === 'BOOK' || item.mallType === 'FOREIGN')
      .filter((item) => {
        const key = item.isbn13 || item.link;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        title: item.title,
        author: item.author,
        publisher: item.publisher,
        pubDate: item.pubDate,
        cover: item.cover,
        link: item.link,
        isbn13: item.isbn13,
        isOutOfPrint: item.stockstatus !== '' && item.stockstatus != null,
      }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('알라딘 API 호출 실패:', error);
    return NextResponse.json(
      { error: '알라딘 API 호출 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
