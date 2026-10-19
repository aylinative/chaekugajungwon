import PageSkeleton from '@/components/PageSkeleton'

// 책 페이지 이동 중 뼈대 — 표지 탭 즉시 화면 전환(연타 방지)
export default function Loading() {
  return <PageSkeleton title="그림책" variant="book" />
}
