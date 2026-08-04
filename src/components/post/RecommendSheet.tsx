'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { RECOMMEND_GROUPS } from '@/lib/groups'
import PeriodDistribution from '@/components/book/PeriodDistribution'

// '나도 추천해요' 바텀시트 (CLAUDE.md 10.3)
// - 기본 선택값 없음(앵커링 방지). 재탭 시에만 기존 선택 표시.
// - 분포는 '완료' 이후에만 노출.
// - 하단에서 올라오는 시트(중앙 모달 금지 — 엄지 영역).

export interface RecommendResult {
  liked: boolean
  count: number
  groupNames: string[]
}

interface Props {
  bookId: string // 추천은 책 단위 (2026.08 전환)
  initialGroups: string[] // 재탭 시 기존 선택 (신규면 빈 배열)
  onSaved: (result: RecommendResult) => void
  onClose: () => void
}

export default function RecommendSheet({ bookId, initialGroups, onSaved, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(initialGroups)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    distribution: Record<string, number>
    totalVoters: number
    groupNames: string[]
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const toggle = (label: string) => {
    setSelected((cur) =>
      cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]
    )
  }

  const submit = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_names: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '추천에 실패했습니다.')
      onSaved({ liked: data.liked, count: data.count, groupNames: data.groupNames })
      if (data.liked) {
        // 완료 직후에만 분포를 보여준다 (선택 전 노출 금지 — 앵커링 방지)
        setResult({
          distribution: data.distribution ?? {},
          totalVoters: data.totalVoters ?? 0,
          groupNames: data.groupNames ?? [],
        })
      } else {
        onClose() // 해제는 분포 없이 바로 닫기
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '추천에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  const isRemoval = selected.length === 0 && initialGroups.length > 0
  const submitDisabled = saving || (selected.length === 0 && initialGroups.length === 0)

  return createPortal(
    // 카드(Link) 안에서 열려도 페이지 이동으로 새지 않도록 이벤트를 여기서 끊는다
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-5 pb-8 shadow-lg">
        {result ? (
          <>
            <p className="mb-3 text-center text-sm font-semibold text-text">
              추천 완료! 지금까지의 추천 시기예요
            </p>
            <PeriodDistribution
              votes={result.distribution}
              totalVoters={result.totalVoters}
              myGroups={result.groupNames}
            />
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl bg-main py-3 text-sm font-semibold text-white"
            >
              확인
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-center text-sm font-semibold text-text">
              어느 시기 아이에게 추천하시나요?
            </p>
            {/* 6개 시기 칩 — 3×2 그리드, 스크롤 없이 한 화면 */}
            <div className="grid grid-cols-3 gap-2">
              {RECOMMEND_GROUPS.map((group) => {
                const active = selected.includes(group.label)
                return (
                  <button
                    key={group.value}
                    type="button"
                    onClick={() => toggle(group.label)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 ${
                      active
                        ? 'border-main bg-main/10'
                        : 'border-black/5 bg-surface-muted'
                    }`}
                  >
                    <span className="text-xl">{group.emoji}</span>
                    <span
                      className={`text-xs ${
                        active ? 'font-semibold text-main' : 'text-text/70'
                      }`}
                    >
                      {group.label}
                    </span>
                    <span className="text-[11px] text-text/40">{group.ageLabel}</span>
                  </button>
                )
              })}
            </div>
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={submitDisabled}
              className={`mt-4 w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-40 ${
                isRemoval ? 'bg-surface-muted text-text/70' : 'bg-main text-white'
              }`}
            >
              {saving ? '저장 중…' : isRemoval ? '추천 해제' : '완료'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
