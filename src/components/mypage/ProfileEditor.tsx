'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getZodiacEmoji, getZodiacName, getAgeDisplay } from '@/lib/age'
import AgeLabel from '@/components/AgeLabel'

interface ChildInput {
  birth_date: string
}

export default function ProfileEditor({
  initialNickname,
  initialChildren,
}: {
  initialNickname: string
  initialChildren: ChildInput[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(initialNickname)
  const [children, setChildren] = useState<ChildInput[]>(initialChildren)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const startEdit = () => {
    setNickname(initialNickname)
    setChildren(initialChildren)
    setError('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setError('')
  }

  const addChild = () => setChildren((prev) => [...prev, { birth_date: '' }])
  const removeChild = (i: number) =>
    setChildren((prev) => prev.filter((_, idx) => idx !== i))
  const updateChildDate = (i: number, date: string) =>
    setChildren((prev) => prev.map((c, idx) => (idx === i ? { birth_date: date } : c)))

  const handleSave = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }
    if (children.some((c) => !c.birth_date)) {
      setError('아이 생년월일을 모두 입력해주세요.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), children }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || '저장에 실패했습니다.')
      }
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ---------- 보기 모드 ----------
  if (!editing) {
    return (
      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-text/40">닉네임</p>
            <p className="mt-0.5 truncate text-lg font-bold text-text">
              {initialNickname || '(닉네임 없음)'}
            </p>
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="flex-shrink-0 rounded-full bg-main/10 px-3 py-1.5 text-xs font-medium text-main"
          >
            편집
          </button>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs text-text/40">아이 정보</p>
          {initialChildren.length === 0 ? (
            <p className="text-sm text-text/40">등록된 아이가 없어요.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {initialChildren.map((c, i) => {
                const year = new Date(c.birth_date).getFullYear()
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm text-text/80"
                  >
                    <span className="text-base">{getZodiacEmoji(year)}</span>
                    {getZodiacName(year)}띠 · <AgeLabel birthDate={c.birth_date} />
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  // ---------- 편집 모드 ----------
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      {/* 닉네임 */}
      <label htmlFor="nickname" className="mb-2 block text-sm font-medium text-text">
        닉네임 <span className="text-red-400">*</span>
      </label>
      <input
        id="nickname"
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="닉네임을 입력해주세요"
        maxLength={20}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-main"
      />

      {/* 아이 정보 */}
      <div className="mb-3 mt-5 flex items-center justify-between">
        <p className="text-sm font-medium text-text">아이 정보</p>
        <button
          type="button"
          onClick={addChild}
          className="rounded-full bg-main/10 px-3 py-1.5 text-xs font-medium text-main"
        >
          + 아이 추가
        </button>
      </div>

      {children.length === 0 ? (
        <div className="rounded-xl bg-surface-muted py-5 text-center">
          <p className="text-xs text-text/40">등록된 아이가 없어요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {children.map((child, index) => {
            const year = child.birth_date
              ? new Date(child.birth_date).getFullYear()
              : null
            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl bg-surface-muted p-3"
              >
                <span className="text-2xl">{year ? getZodiacEmoji(year) : '🐣'}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <input
                    type="date"
                    value={child.birth_date}
                    onChange={(e) => updateChildDate(index, e.target.value)}
                    max={today}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-main"
                  />
                  {child.birth_date && (
                    <p className="text-xs text-text/50">{getAgeDisplay(child.birth_date)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="rounded-full p-1 text-lg text-text/30 hover:text-red-400"
                  aria-label="아이 삭제"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={cancelEdit}
          disabled={saving}
          className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-medium text-text/70 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-2xl bg-main py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </section>
  )
}
