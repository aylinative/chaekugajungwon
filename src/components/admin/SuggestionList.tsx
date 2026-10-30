'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 운영자: 사용자 주제 제안 ('찾는 주제가 없나요?') — 같은 제안끼리 묶어 많이 제안된 순.
// [추가함]은 표시만 바꿈 — 태그는 위 태그 관리에서 직접 추가한다.
export interface SuggestionGroup {
  normalized: string
  text: string // 대표 표기(가장 먼저 들어온 원문)
  count: number
  lastAt: string
  books: string[] // 함께 저장된 책 제목 (최대 3)
  status: 'pending' | 'added' | 'declined'
}

const LABEL = { pending: '대기', added: '추가함', declined: '보류' } as const

export default function SuggestionList({ groups }: { groups: SuggestionGroup[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<SuggestionGroup['status']>('pending')
  const [pending, setPending] = useState(false)

  const setStatus = async (normalized: string, status: SuggestionGroup['status']) => {
    setPending(true)
    try {
      await fetch('/api/topic-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ normalized, status }),
      })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const list = groups.filter((g) => g.status === filter)
  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        {(['pending', 'added', 'declined'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs ${filter === s ? 'bg-main text-white' : 'bg-surface-muted text-text/60'}`}
          >
            {LABEL[s]} {groups.filter((g) => g.status === s).length}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl bg-surface px-3 py-4 text-center text-xs text-text/40">없어요</p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((g) => (
            <li key={g.normalized} className="rounded-xl bg-surface px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  {g.text} <span className="text-[11px] text-text/40">{g.count}회 · {g.lastAt.slice(0, 10)}</span>
                </span>
                {g.status !== 'added' && (
                  <button type="button" disabled={pending} onClick={() => setStatus(g.normalized, 'added')} className="text-xs text-main">
                    추가함
                  </button>
                )}
                {g.status !== 'declined' && (
                  <button type="button" disabled={pending} onClick={() => setStatus(g.normalized, 'declined')} className="text-xs text-text/50">
                    보류
                  </button>
                )}
                {g.status !== 'pending' && (
                  <button type="button" disabled={pending} onClick={() => setStatus(g.normalized, 'pending')} className="text-xs text-text/50">
                    대기로
                  </button>
                )}
              </div>
              {g.books.length > 0 && <p className="mt-0.5 truncate text-[11px] text-text/40">책: {g.books.join(', ')}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
