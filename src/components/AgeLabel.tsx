'use client'

import { useEffect, useState } from 'react'
import { getAgeDisplay } from '@/lib/age'

// 생년월일로 나이를 계산해 표시한다.
// 나이는 저장값이 아니라 매번 계산하므로 새로고침·재방문 시 항상 최신.
// 추가로, 탭을 다시 볼 때(재방문)만 재계산한다. (모두 브라우저 내 계산이라 호출 비용 없음)
export default function AgeLabel({ birthDate }: { birthDate: string }) {
  const [label, setLabel] = useState(() => getAgeDisplay(birthDate))

  useEffect(() => {
    const update = () => setLabel(getAgeDisplay(birthDate))
    update()

    const onVisible = () => {
      if (!document.hidden) update()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [birthDate])

  return <>{label}</>
}
