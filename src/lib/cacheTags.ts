import { revalidateTag } from 'next/cache'

// 홈 피드·그룹 더보기 공개 집계 캐시(lib/feed.ts getPublicFeed)의 태그.
export const FEED_CACHE_TAG = 'feed'

// 피드에 영향을 주는 쓰기(기록 생성·수정·삭제/숨김·복구, 추천, 운영자 태그) 직후 호출.
// ※ 저장(북마크)은 호출하지 않는다 — 내가 저장했는지는 요청마다 새로 덧씌우므로 항상 최신이고,
//   가장 잦은 쓰기라 매번 캐시를 날리면 캐시 효과가 사라진다. 다른 사람에게 보이는 저장 수(5명 이상만 표시)는
//   최대 60초(캐시 TTL) 늦게 반영될 수 있다.
// Next 16: 단일 인자 revalidateTag는 deprecated, 'max'는 stale-while-revalidate라 쓰기 직후
// 다음 방문에 옛 피드가 보인다. Route Handler에선 updateTag를 못 쓰므로 { expire: 0 }으로
// 즉시 만료(다음 요청은 새로 계산)한다 — 내가 방금 남긴 기록·추천이 바로 보이게.
export function revalidateFeed() {
  revalidateTag(FEED_CACHE_TAG, { expire: 0 })
}
