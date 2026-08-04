'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getZodiacEmoji, getAgeDisplay } from '@/lib/age'

interface ChildInput {
  birth_date: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [children, setChildren] = useState<ChildInput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/')
        return
      }

      const defaultNickname =
        user.user_metadata?.nickname ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        ''
      setNickname(defaultNickname)
      setIsLoading(false)
    }
    loadUser()
  }, [router])

  const addChild = () => {
    setChildren((prev) => [...prev, { birth_date: '' }])
  }

  const removeChild = (index: number) => {
    setChildren((prev) => prev.filter((_, i) => i !== index))
  }

  const updateChildDate = (index: number, date: string) => {
    setChildren((prev) =>
      prev.map((child, i) => (i === index ? { birth_date: date } : child))
    )
  }

  const handleSubmit = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }

    const emptyChildren = children.filter((c) => !c.birth_date)
    if (emptyChildren.length > 0) {
      setError('아이 생년월일을 모두 입력해주세요.')
      return
    }

    setIsSubmitting(true)
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

      // 온보딩 다음은 첫 기록 — 모든 유저는 기록 1건을 쓰고 서비스를 시작한다 (11.4)
      router.replace('/recommend/create?first=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text/60">로딩 중...</p>
      </main>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-md px-4 pb-12 pt-10">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <span className="text-5xl">🌱</span>
          <h1 className="mt-4 text-xl font-bold text-text">
            책육아정원에 오신 것을 환영해요!
          </h1>
          <p className="mt-2 text-sm text-text/60">
            프로필을 설정하고 책육아를 시작해보세요.
          </p>
        </div>

        <div className="space-y-4">
          {/* 닉네임 */}
          <section className="rounded-2xl bg-surface p-5 shadow-sm">
            <label
              htmlFor="nickname"
              className="mb-2 block text-sm font-medium text-text"
            >
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
            <p className="mt-1.5 text-xs text-text/40">
              카카오 이름으로 자동 입력됩니다. 원하시면 수정하세요.
            </p>
          </section>

          {/* 아이 정보 */}
          <section className="rounded-2xl bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">아이 정보</p>
                <p className="mt-0.5 text-xs text-text/40">
                  나중에 마이페이지에서도 추가할 수 있어요.
                </p>
              </div>
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
                <p className="text-xs text-text/40">
                  아이 정보를 추가하면 연령에 맞는 책을 기록할 수 있어요.
                </p>
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
                      <span className="text-2xl">
                        {year ? getZodiacEmoji(year) : '🐣'}
                      </span>
                      <div className="flex flex-1 flex-col gap-1">
                        <input
                          type="date"
                          value={child.birth_date}
                          onChange={(e) => updateChildDate(index, e.target.value)}
                          max={today}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-main"
                        />
                        {child.birth_date && (
                          <p className="text-xs text-text/50">
                            {getAgeDisplay(child.birth_date)}
                          </p>
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
          </section>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="mt-5 w-full rounded-2xl bg-main py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '시작하기'}
        </button>
      </div>
    </main>
  )
}
