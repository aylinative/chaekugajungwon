'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TAG_CATEGORIES } from '@/lib/tagCategories'

export interface AdminTag {
  id: string
  name: string
  tag_category: string | null
  is_active: boolean
  sort_order: number
  uses: number // 이 태그가 붙은 기록 수
}

export default function TagManager({ tags }: { tags: AdminTag[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // 새 태그 추가 폼
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState<string>(TAG_CATEGORIES[0])

  // 개명/카테고리 편집
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCat, setEditCat] = useState<string>(TAG_CATEGORIES[0])

  async function call(method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) {
    if (pending) return false
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/operator-tags', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '처리에 실패했습니다.')
      router.refresh()
      return true
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '처리에 실패했습니다.')
      return false
    } finally {
      setPending(false)
    }
  }

  async function add() {
    if (!newName.trim()) {
      setMessage('태그 이름을 입력하세요.')
      return
    }
    const ok = await call('POST', { name: newName, tag_category: newCat })
    if (ok) setNewName('')
  }

  function startEdit(t: AdminTag) {
    setEditingId(t.id)
    setEditName(t.name)
    setEditCat(t.tag_category ?? TAG_CATEGORIES[0])
    setMessage(null)
  }

  async function saveEdit(id: string) {
    const ok = await call('PATCH', { id, name: editName, tag_category: editCat })
    if (ok) setEditingId(null)
  }

  async function remove(t: AdminTag) {
    if (!window.confirm(`'${t.name}' 태그를 완전히 삭제할까요? 되돌릴 수 없어요.`)) return
    await call('DELETE', { id: t.id })
  }

  const byCategory = TAG_CATEGORIES.map((cat) => ({
    cat,
    items: tags
      .filter((t) => t.tag_category === cat)
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.sort_order - b.sort_order),
  }))
  const uncategorized = tags.filter(
    (t) => !TAG_CATEGORIES.includes((t.tag_category ?? '') as (typeof TAG_CATEGORIES)[number])
  )

  return (
    <div className="space-y-6">
      {/* 새 태그 추가 */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-text">새 주제 태그 추가</h2>
        <div className="flex flex-col gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="태그 이름 (예: 우주)"
            className="rounded-xl border border-black/10 bg-bg px-3 py-2 text-sm text-text outline-none focus:border-main"
          />
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="rounded-xl border border-black/10 bg-bg px-3 py-2 text-sm text-text outline-none focus:border-main"
          >
            {TAG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={pending}
            className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </section>

      {message && (
        <p className="rounded-xl bg-point/10 px-3 py-2 text-xs text-point">{message}</p>
      )}

      {/* 카테고리별 태그 목록 */}
      {byCategory.map(({ cat, items }) => (
        <section key={cat}>
          <h2 className="mb-2 px-1 text-sm font-semibold text-text">
            {cat} <span className="text-text/40">{items.length}</span>
          </h2>
          <ul className="space-y-2">
            {items.map((t) => (
              <li
                key={t.id}
                className={`rounded-2xl bg-surface p-3 shadow-sm ${
                  t.is_active ? '' : 'opacity-50'
                }`}
              >
                {editingId === t.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-xl border border-black/10 bg-bg px-3 py-2 text-sm text-text outline-none focus:border-main"
                    />
                    <select
                      value={editCat}
                      onChange={(e) => setEditCat(e.target.value)}
                      className="rounded-xl border border-black/10 bg-bg px-3 py-2 text-sm text-text outline-none focus:border-main"
                    >
                      {TAG_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(t.id)}
                        disabled={pending}
                        className="flex-1 rounded-xl bg-main px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded-xl border border-black/10 px-3 py-1.5 text-xs text-text/70"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-text">
                      {t.name}
                      <span className="ml-1.5 text-xs text-text/40">· 기록 {t.uses}</span>
                      {!t.is_active && <span className="ml-1 text-xs text-text/40">(비활성)</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="flex-shrink-0 rounded-full border border-black/10 px-3 py-1 text-xs text-text/70"
                    >
                      개명
                    </button>
                    <button
                      type="button"
                      onClick={() => call('PATCH', { id: t.id, is_active: !t.is_active })}
                      disabled={pending}
                      className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                        t.is_active
                          ? 'border border-black/10 text-text/70'
                          : 'bg-main text-white'
                      }`}
                    >
                      {t.is_active ? '비활성' : '활성화'}
                    </button>
                    {/* 완전 삭제: 비활성 + 연결된 기록 0 일 때만(연결 있으면 비활성 유지=히스토리 보존) */}
                    {!t.is_active && t.uses === 0 && (
                      <button
                        type="button"
                        onClick={() => remove(t)}
                        disabled={pending}
                        className="flex-shrink-0 rounded-full border border-point/40 px-3 py-1 text-xs text-point disabled:opacity-50"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-1 text-xs text-text/40">태그 없음</li>
            )}
          </ul>
        </section>
      ))}

      {/* 6개 카테고리에 안 속한 태그(구 형태 축 등) — 참고용으로만 노출 */}
      {uncategorized.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-text/50">
            기타 / 구 카테고리 <span className="text-text/40">{uncategorized.length}</span>
          </h2>
          <ul className="space-y-2">
            {uncategorized.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-2xl bg-surface p-3 opacity-60 shadow-sm"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  {t.name}{' '}
                  <span className="text-xs text-text/40">
                    [{t.tag_category ?? '없음'}] · 기록 {t.uses}
                    {!t.is_active && ' 비활성'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="flex-shrink-0 rounded-full border border-black/10 px-3 py-1 text-xs text-text/70"
                >
                  카테고리 지정
                </button>
                {!t.is_active && t.uses === 0 && (
                  <button
                    type="button"
                    onClick={() => remove(t)}
                    disabled={pending}
                    className="flex-shrink-0 rounded-full border border-point/40 px-3 py-1 text-xs text-point disabled:opacity-50"
                  >
                    삭제
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
