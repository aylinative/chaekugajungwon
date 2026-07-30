import { RECOMMEND_GROUPS } from '@/lib/groups'
import ComingSoon from '@/components/ComingSoon'

export default async function GroupPage({
  params,
}: {
  params: Promise<{ group: string }>
}) {
  const { group } = await params
  const label = RECOMMEND_GROUPS.find((g) => g.value === group)?.label ?? '그룹'
  return <ComingSoon title={`${label} 전체보기`} emoji="🌳" />
}
