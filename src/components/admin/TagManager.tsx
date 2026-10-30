'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TAG_CATEGORIES } from '@/lib/tagCategories'

// 운영자 주제 태그 관리 (2026.10 개편) — 큰 분류 → 주제 → 세부.
// 태그마다 이름·칩 예시·검색 별칭·소개 매칭어·소개 제외어·정렬·숨김을 고친다.
// 숨김은 삭제가 아님(기존 기록 연결 유지). 완전 삭제는 '숨김 + 연결 0건 + 세부 없음'일 때만.
export interface AdminTag {
  id: string
  slug: string | null
  name: string
  level: 'topic' | 'detail'
  parent_id: string | null
  tag_category: string | null
  is_active: boolean
  sort_order: number
  chip_example: string | null
  search_aliases: string[]
  intro_keywords: string[]
  intro_excludes: string[]
  uses: number // 이 태그가 붙은 기록 수
}

const input = 'w-full rounded-lg border border-black/10 bg-surface px-2 py-1.5 text-xs outline-none focus:border-main'

export default function TagManager({ tags }: { tags: AdminTag[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [newName, setNewName] = useState<Record<string, string>>({}) // key: 큰 분류 또는 상위 주제 id

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

  const startEdit = (t: AdminTag) => {
    setEditingId(t.id)
    setDraft({
      name: t.name,
      tag_category: t.tag_category ?? TAG_CATEGORIES[0],
      chip_example: t.chip_example ?? '',
      search_aliases: t.search_aliases.join(' | '),
      intro_keywords: t.intro_keywords.join(' | '),
      intro_excludes: t.intro_excludes.join(' | '),
      sort_order: String(t.sort_order),
    })
  }
  const save = async (t: AdminTag) => {
    const body: Record<string, unknown> = { id: t.id, ...draft }
    if (t.level !== 'topic') delete body.tag_category
    if (await call('PATCH', body)) setEditingId(null)
  }
  const add = async (key: string, payload: Record<string, unknown>) => {
    const name = (newName[key] ?? '').trim()
    if (!name) return setMessage('이름을 입력하세요.')
    if (await call('POST', { name, ...payload })) setNewName((m) => ({ ...m, [key]: '' }))
  }

  const childrenOf = (id: string) => tags.filter((t) => t.parent_id === id).sort((a, b) => a.sort_order - b.sort_order)

  // 렌더 함수(컴포넌트 아님) — 안에서 정의한 컴포넌트는 입력할 때마다 다시 만들어져 입력창 포커스가 풀림
  const row = (t: AdminTag) => {
    const editing = editingId === t.id
    return (
      <div className={`rounded-xl px-3 py-2 ${t.is_active ? 'bg-surface' : 'bg-surface-muted/60'}`}>
        <div className="flex items-center gap-2">
          <span className={`min-w-0 flex-1 truncate text-sm ${t.is_active ? 'text-text' : 'text-text/40 line-through'}`}>
            {t.level === 'detail' && <span className="text-text/40">› </span>}
            {t.name}
            <span className="ml-1.5 text-[11px] text-text/40">기록 {t.uses}</span>
            {!t.is_active && <span className="ml-1.5 text-[11px] text-text/40">숨김</span>}
          </span>
          <button type="button" onClick={() => (editing ? setEditingId(null) : startEdit(t))} className="text-xs text-main">
            {editing ? '닫기' : '수정'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => call('PATCH', { id: t.id, is_active: !t.is_active })}
            className="text-xs text-text/50"
          >
            {t.is_active ? '숨김' : '보이기'}
          </button>
          {!t.is_active && t.uses === 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm(`'${t.name}' 태그를 완전히 삭제할까요?`) && call('DELETE', { id: t.id })}
              className="text-xs text-red-500"
            >
              삭제
            </button>
          )}
        </div>
        {!editing && t.chip_example && <p className="mt-0.5 truncate text-[11px] text-text/40">{t.chip_example}</p>}

        {editing && (
          <div className="mt-2 space-y-1.5">
            <label className="block text-[11px] text-text/50">
              이름
              <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            {t.level === 'topic' && (
              <label className="block text-[11px] text-text/50">
                큰 분류 (옮기면 세부도 함께)
                <select className={input} value={draft.tag_category} onChange={(e) => setDraft({ ...draft, tag_category: e.target.value })}>
                  {TAG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-[11px] text-text/50">
              칩 예시 (기록하기 시트의 회색 예시)
              <input className={input} value={draft.chip_example} onChange={(e) => setDraft({ ...draft, chip_example: e.target.value })} />
            </label>
            {(['search_aliases', 'intro_keywords', 'intro_excludes'] as const).map((k) => (
              <label key={k} className="block text-[11px] text-text/50">
                {k === 'search_aliases'
                  ? '검색 별칭 (홈 검색 — | 로 구분)'
                  : k === 'intro_keywords'
                    ? '소개 매칭어 (2글자 이상, ^=제목에서만, 말>세부+세부)'
                    : '소개 제외어'}
                <textarea rows={2} className={input} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </label>
            ))}
            <label className="block text-[11px] text-text/50">
              정렬 (작을수록 앞)
              <input type="number" className={input} value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => save(t)}
              className="w-full rounded-lg bg-main py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              저장
            </button>
          </div>
        )}
      </div>
    )
  }

  const addBox = (k: string, placeholder: string, payload: Record<string, unknown>) => (
    <div className="flex gap-1.5">
      <input
        className={input}
        placeholder={placeholder}
        value={newName[k] ?? ''}
        onChange={(e) => setNewName((m) => ({ ...m, [k]: e.target.value }))}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => add(k, payload)}
        className="flex-shrink-0 rounded-lg bg-main px-3 text-xs font-medium text-white disabled:opacity-50"
      >
        추가
      </button>
    </div>
  )

  return (
    <div>
      {message && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{message}</p>}
      <div className="space-y-2">
        {TAG_CATEGORIES.map((cat) => {
          const topics = tags
            .filter((t) => t.level === 'topic' && t.tag_category === cat)
            .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.sort_order - b.sort_order)
          const open = openCat === cat
          return (
            <section key={cat} className="rounded-2xl bg-surface-muted/50 p-2">
              <button
                type="button"
                onClick={() => setOpenCat(open ? null : cat)}
                className="flex w-full items-center justify-between px-1 py-1.5 text-sm font-semibold text-text"
              >
                <span>
                  {cat} <span className="text-xs font-normal text-text/40">주제 {topics.filter((t) => t.is_active).length}</span>
                </span>
                <span className="text-text/40">{open ? '▲' : '▾'}</span>
              </button>
              {open && (
                <div className="mt-1 space-y-1.5">
                  {topics.map((t) => (
                    <div key={t.id} className="space-y-1">
                      {row(t)}
                      {t.is_active && (
                        <div className="ml-4 space-y-1">
                          {childrenOf(t.id).map((d) => (
                            <div key={d.id}>{row(d)}</div>
                          ))}
                          {addBox(t.id, `'${t.name}'에 세부 추가`, { parent_id: t.id })}
                        </div>
                      )}
                    </div>
                  ))}
                  {addBox(cat, `'${cat}'에 주제 추가`, { tag_category: cat })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
