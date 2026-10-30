'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  indexTags,
  removeDetail,
  summaryChips,
  toggleDetailInBox,
  toggleDetailPair,
  toggleGroup,
  toggleTopic,
  type TopicPick,
  type TaxonomyData,
  type TopicSource,
} from '@/lib/topics'
import { matchTopics } from '@/lib/topicMatch'
import TopicChip from '@/components/record/TopicChip'
import TopicSheet from '@/components/record/TopicSheet'

// 기록하기 '주제 태그' 영역 (docs/taxonomy/DECISIONS.md 8장 — '가벼운 입력')
// 위에서 아래: 제목 줄 / 설명 / 고른 주제(진한 칩) / 세부(가로 스크롤 한 줄) / 책 소개를 참고한 추천 주제(최대 3, 안 고른 것만) / 주제 더보기(오른쪽) / 다른 양육자 줄(조건부)
// - 추천은 책 소개 매칭만. 자주 쓰는 주제로 채우지 않음(책과 상관없는 칩이 나와서 — 2026.10.28 운영자)
// - 미리 선택해 두지 않음, 고르는 개수 상한 없음, 고르는 칩에 '#' 없음
interface Props {
  taxonomy: TaxonomyData | null
  picks: TopicPick[]
  onChange: (next: TopicPick[]) => void
  bookTitle: string
  bookDescription: string // 카카오 책 소개 (수정 화면에서는 비어 있음 → 추천 줄 없음)
  bookKey: string | null
}

export default function TopicPicker({ taxonomy, picks, onChange, bookTitle, bookDescription, bookKey }: Props) {
  const tags = useMemo(() => taxonomy?.tags ?? [], [taxonomy])
  const idx = useMemo(() => indexTags(tags), [tags])
  const [boxTopic, setBoxTopic] = useState<string | null>(null) // 세부 박스: 마지막으로 고른 세부 있는 주제
  const [sheetOpen, setSheetOpen] = useState(false)
  const [othersState, setOthersState] = useState<{ key: string; slugs: string[] } | null>(null)
  const others = useMemo(
    () => (othersState && othersState.key === bookKey ? othersState.slugs : []), // 책이 바뀌면 이전 책 값은 버림
    [othersState, bookKey]
  )

  const matched = useMemo(
    () => (tags.length ? matchTopics(tags, idx, bookTitle, bookDescription) : []),
    [tags, idx, bookTitle, bookDescription]
  )

  // 같은 책의 다른 양육자 선택 — 책이 바뀔 때만 불러옴 (보여주는 건 내가 하나 이상 고른 뒤)
  useEffect(() => {
    if (!bookKey) return
    let alive = true
    fetch(`/api/topics/others?book_key=${encodeURIComponent(bookKey)}`)
      .then((r) => (r.ok ? r.json() : { slugs: [] }))
      .then((d) => alive && setOthersState({ key: bookKey, slugs: Array.isArray(d.slugs) ? d.slugs : [] }))
      .catch(() => alive && setOthersState({ key: bookKey, slugs: [] }))
    return () => {
      alive = false
    }
  }, [bookKey])

  const picked = useMemo(() => new Set(picks.map((p) => p.slug)), [picks])
  const isOn = (slug: string) => picked.has(slug)

  // 칩 하나 = 고르기 단위. 세부 칩은 주제+세부 한 번에. 세부 있는 주제를 고르면 세부 박스를 그 주제로.
  const pickChip = (slug: string, source: TopicSource) => {
    const tag = idx.bySlug.get(slug)
    if (!tag) return
    if (tag.level === 'detail') {
      const next = toggleDetailPair(picks, idx, slug, source)
      onChange(next)
      const parent = tag.parent!
      // 세부까지 고른 칩이라 세부 줄을 띄울 이유가 없음 (2026.10.28 운영자)
      if (boxTopic === parent) setBoxTopic(null)
      return
    }
    const wasOn = isOn(slug)
    onChange(toggleTopic(picks, idx, slug, source))
    if (wasOn) {
      if (boxTopic === slug) setBoxTopic(null)
    } else {
      setBoxTopic((idx.details.get(slug) ?? []).length > 0 ? slug : null)
    }
  }

  const chips = summaryChips(picks, idx)
  // 추천 줄: 아직 안 고른 것만 (고르면 위 '고른 주제' 줄로 옮겨가서 같은 칩이 두 번 보이지 않음)
  const recShown = matched.filter((m) => !(m.details.length ? m.details.every(isOn) : isOn(m.topic)))
  // 추천 칩 누르기: 여러 세부를 한 칩으로 묶은 경우(사계절 등)도 한 번에. 세부 있는 주제면 세부 줄을 그 주제로.
  const pickMatch = (topic: string, details: string[]) => {
    const next = toggleGroup(picks, idx, topic, details, 'recommend')
    onChange(next)
    // 세부가 이미 들어간 칩(예: 하늘·우주 › 달)은 세부 줄을 닫음. 주제만 추천된 칩이고 그 주제에 세부가 있을 때만 띄움.
    const open = details.length === 0 && next.some((p) => p.slug === topic) && (idx.details.get(topic) ?? []).length > 0
    setBoxTopic(open ? topic : null)
  }
  // 다른 양육자 줄: 이미 고른 것·추천 줄에 있는 것은 빼고, 세부가 있으면 그 상위 주제 칩은 생략
  const othersShown = useMemo(() => {
    const inRec = new Set(matched.flatMap((m) => (m.details.length ? m.details : [m.topic])))
    const list = others.filter((s) => idx.bySlug.has(s) && !picked.has(s) && !inRec.has(s))
    const detailParents = new Set(list.map((s) => idx.bySlug.get(s)!.parent).filter(Boolean))
    return list.filter((s) => !detailParents.has(s))
  }, [others, matched, picked, idx])

  if (!taxonomy) {
    return <p className="text-xs text-text/40">주제를 불러오는 중…</p>
  }

  const box = boxTopic && isOn(boxTopic) ? idx.bySlug.get(boxTopic) : null
  const scrollRow =
    'flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

  // 2026.10.28 운영자: 영역이 넓어지지 않게 — 고른 주제는 박스 없이 한 줄(진한 칩), 추천은 안 고른 것만,
  // 세부·다른 양육자 줄은 줄바꿈 없는 가로 스크롤 한 줄
  return (
    <div>
      <p className="text-sm font-medium">
        주제 태그 <span className="ml-1 text-xs font-normal text-text/40">선택</span>
      </p>
      <p className="mb-2 mt-1 text-xs text-text/55">내가 고른 주제는 다른 양육자가 책을 찾을 때 도움이 돼요</p>

      {taxonomy.preview && (
        <p className="mb-2 rounded-xl bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          개발용 미리보기예요 (DB 개편 전). 화면 확인만 되고 저장은 되지 않아요.
        </p>
      )}

      {chips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c.key} className="flex h-9 items-center whitespace-nowrap rounded-full bg-main pl-3 text-[13px] text-white">
              {c.detail ? (
                <span>
                  <span className="text-white/75">{c.topic.name} ›</span>
                  <span className="ml-1 font-semibold">{c.detail.name}</span>
                </span>
              ) : (
                <span className="font-medium">{c.topic.name}</span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (c.detail) onChange(removeDetail(picks, idx, c.detail.slug))
                  else {
                    onChange(toggleTopic(picks, idx, c.topic.slug, 'all'))
                    if (boxTopic === c.topic.slug) setBoxTopic(null)
                  }
                }}
                aria-label={`${c.topic.name}${c.detail ? ' ' + c.detail.name : ''} 빼기`}
                className="flex h-9 w-8 items-center justify-center text-sm text-white/70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {box && (
        <div className={`mb-2 rounded-xl bg-black/[0.03] px-2 py-1.5 ${scrollRow}`}>
          <span className="flex-shrink-0 pl-1 text-[11px] text-text/55">{box.name} ›</span>
          {(idx.details.get(box.slug) ?? []).map((d) => (
            <button
              key={d.slug}
              type="button"
              aria-pressed={isOn(d.slug)}
              onClick={() => onChange(toggleDetailInBox(picks, idx, d.slug, 'recommend'))}
              className={`h-8 flex-shrink-0 rounded-full px-2.5 text-[12px] ${
                isOn(d.slug) ? 'bg-main font-medium text-white' : 'bg-surface text-text/70'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {recShown.length > 0 && (
        <div className="mb-1">
          <p className="mb-1 text-[11px] text-text/50">책 소개를 참고한 추천 주제</p>
          <div className="flex flex-wrap gap-1.5">
            {recShown.map((m) => (
              <TopicChip
                key={m.key}
                topic={idx.bySlug.get(m.topic)!.name}
                detail={m.details.length ? m.details.map((d) => idx.bySlug.get(d)!.name).join('·') : null}
                selected={false}
                onClick={() => pickMatch(m.topic, m.details)}
              />
            ))}
          </div>
        </div>
      )}

      {/* '주제 더보기'는 추천 주제 아래, 오른쪽 정렬 (2026.10.28 운영자) */}
      <div className="-mt-1 flex justify-end">
        <button type="button" onClick={() => setSheetOpen(true)} className="h-7 pl-3 text-[13px] font-medium text-main">
          주제 더보기 ›
        </button>
      </div>

      {picks.length > 0 && othersShown.length > 0 && (
        <div className="mt-1">
          <p className="mb-1 text-[11px] text-text/50">
            다른 양육자들은 이런 주제도 골랐어요 · <span className="text-text/40">놓친 게 있다면 더해주세요</span>
          </p>
          <div className={scrollRow}>
            {othersShown.map((slug) => {
              const tag = idx.bySlug.get(slug)!
              const topic = tag.parent ? idx.bySlug.get(tag.parent)! : tag
              return (
                <TopicChip
                  key={slug}
                  variant="dashed"
                  topic={topic.name}
                  detail={tag.level === 'detail' ? tag.name : null}
                  selected={false}
                  onClick={() => pickChip(slug, 'others')}
                />
              )
            })}
          </div>
        </div>
      )}

      {sheetOpen && (
        <TopicSheet
          tags={tags}
          idx={idx}
          picks={picks}
          onToggleTopic={(slug) => onChange(toggleTopic(picks, idx, slug, 'all'))}
          onToggleDetail={(slug) => onChange(toggleDetailInBox(picks, idx, slug, 'all'))}
          bookKey={bookKey}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  )
}
