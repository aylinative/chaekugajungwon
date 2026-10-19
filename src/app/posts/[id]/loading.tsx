import PageSkeleton from '@/components/PageSkeleton'

// 기록 상세 이동 중 뼈대 — 기록 카드 탭 즉시 화면 전환(연타 방지)
export default function Loading() {
  return <PageSkeleton title="책육아 기록" variant="post" />
}
