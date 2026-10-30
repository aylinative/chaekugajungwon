'use client'

import { useRouter } from 'next/navigation'
import type { OperatorTag } from '@/lib/feedShared'
import type { TopicFilterValue } from '@/lib/topicDisplay'
import TopicFilter from '@/components/feed/TopicFilter'

// 홈 주제 필터 — 큰 분류 → 주제 → 세부. 고르면 ?cat=&tag= 로 이동해 서버에서 필터링(SSR 유지).
export default function TopicFilterBar({ tags, value }: { tags: OperatorTag[]; value: TopicFilterValue }) {
  const router = useRouter()
  const go = (next: TopicFilterValue) => {
    const p = new URLSearchParams()
    if (next.cat) p.set('cat', next.cat)
    if (next.tag) p.set('tag', next.tag)
    const q = p.toString()
    router.push(q ? `/?${q}` : '/')
  }
  return (
    <div className="border-b border-black/5 px-4 pt-3">
      <TopicFilter tags={tags} value={value} onSelect={go} />
    </div>
  )
}
