'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TAG_CATEGORIES } from '@/lib/tagCategories'
import type { TopicPick, TagIndex, TaxTag } from '@/lib/topics'
import TopicSuggest from '@/components/record/TopicSuggest'

// '주제 더보기' → 전체 주제 바텀시트 (DECISIONS 8장)
// - 큰 분류 10개 아코디언(한 번에 하나) + 고른 개수. 주제 미리보기 줄은 두지 않음(펼치면 보여서 중복 — 2026.10.28)
// - 펼치면 주제 카드 2열(이름 + 예시 문구). 세부가 있는 주제를 고르면 그 아래 세부 칩 영역이 열리고 화면이 그쪽으로 내려감
// - 맨 아래 '찾는 주제가 없나요?'
interface Props {
  tags: TaxTag[]
  idx: TagIndex
  picks: TopicPick[]
  onToggleTopic: (slug: string) => void
  onToggleDetail: (slug: string) => void
  bookKey: string | null
  onClose: () => void
}

const CATEGORY_NOTE: Record<string, string> = {
  동물: '사는 곳으로 나눴어요. 곤충·벌레와 공룡은 따로 있어요.',
}

export default function TopicSheet({ tags, idx, picks, onToggleTopic, onToggleDetail, bookKey, onClose }: Props) {
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [detailOf, setDetailOf] = useState<string | null>(null) // 세부 칩을 펼친 주제 (한 번에 하나)
  const detailRef = useRef<HTMLDivElement>(null)
  // 세부 영역이 열리면 보이도록 살짝 스크롤
  useEffect(() => {
    if (detailOf) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [detailOf])
  // 시트가 열려 있는 동안 뒤 페이지 스크롤 막기
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const picked = useMemo(() => new Set(picks.map((p) => p.slug)), [picks])
  const topicsByCat = useMemo(() => {
    const m = new Map<string, TaxTag[]>()
    for (const t of tags) {
      if (t.level !== 'topic') continue
      if (!m.has(t.category)) m.set(t.category, [])
      m.get(t.category)!.push(t)
    }
    for (const list of m.values()) list.sort((a, b) => a.order - b.order)
    return m
  }, [tags])
  const pickedTopicCount = picks.filter((p) => idx.bySlug.get(p.slug)?.level === 'topic').length


  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[82vh] max-w-md flex-col rounded-t-3xl bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
          <div>
            <p className="text-base font-semibold text-text">전체 주제</p>
            <p className="text-xs text-text/50">{pickedTopicCount}개 골랐어요</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="flex h-11 w-11 items-center justify-center text-xl text-text/50">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {TAG_CATEGORIES.map((cat) => {
            const list = topicsByCat.get(cat) ?? []
            if (list.length === 0) return null
            const open = openCat === cat
            const count = list.filter((t) => picked.has(t.slug)).length
            return (
              <div key={cat} className="border-b border-black/5 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenCat(open ? null : cat)}
                  aria-expanded={open}
                  className="flex min-h-[52px] w-full items-center gap-2 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
                      {cat}
                      {count > 0 && (
                        <span className="rounded-full bg-main px-1.5 text-[11px] font-medium text-white">{count}</span>
                      )}
                    </span>
                  </span>
                  <span className={`text-text/40 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
                </button>

                {open && (
                  <div className="pb-3">
                    {CATEGORY_NOTE[cat] && <p className="mb-2 text-xs text-text/50">{CATEGORY_NOTE[cat]}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      {list.map((t) => {
                        const on = picked.has(t.slug)
                        const details = idx.details.get(t.slug) ?? []
                        return (
                          <button
                            key={t.slug}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              onToggleTopic(t.slug)
                              setDetailOf(!on && details.length > 0 ? t.slug : detailOf === t.slug ? null : detailOf)
                            }}
                            className={`min-h-[56px] rounded-2xl px-3 py-2 text-left ${
                              on ? 'bg-main text-white' : 'bg-surface-muted'
                            }`}
                          >
                            <span className={`block text-[13px] ${on ? 'font-semibold text-white' : 'text-text/80'}`}>{t.name}</span>
                            {t.chip && <span className={`block truncate text-[11px] ${on ? 'text-white/70' : 'text-text/45'}`}>{t.chip}</span>}
                          </button>
                        )
                      })}
                    </div>

                    {detailOf && list.some((t) => t.slug === detailOf) && picked.has(detailOf) && (
                      <div ref={detailRef} className="mt-2 scroll-mb-4 rounded-2xl bg-black/[0.03] p-3">
                        <p className="mb-2 text-xs text-text/55">
                          {idx.bySlug.get(detailOf)?.name} · 더 자세히 고를 수 있어요 (선택)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(idx.details.get(detailOf) ?? []).map((d) => {
                            const on = picked.has(d.slug)
                            return (
                              <button
                                key={d.slug}
                                type="button"
                                aria-pressed={on}
                                onClick={() => onToggleDetail(d.slug)}
                                className={`min-h-[44px] rounded-full px-3.5 text-[13px] ${
                                  on ? 'bg-main font-medium text-white' : 'bg-surface text-text/70'
                                }`}
                              >
                                {d.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="mt-4">
            <TopicSuggest bookKey={bookKey} />
          </div>
        </div>

        <div className="border-t border-black/5 px-4 py-3 pb-6">
          <button type="button" onClick={onClose} className="min-h-[48px] w-full rounded-2xl bg-main text-sm font-semibold text-white">
            완료
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
