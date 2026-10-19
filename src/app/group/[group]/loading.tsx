import PageSkeleton from '@/components/PageSkeleton'

// 그룹 더보기 이동 중 뼈대 — '더보기' 탭 즉시 화면 전환(연타 방지)
export default function Loading() {
  return <PageSkeleton variant="grid" />
}
