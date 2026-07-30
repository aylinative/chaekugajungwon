'use client'

import { useState } from 'react'

export interface CommentItem {
  id: string
  content: string
  created_at: string
  user_id: string
  nickname: string
}

interface Props {
  postId: string
  initialLiked: boolean
  initialCount: number
  initialComments: CommentItem[]
  currentUserId: string | null
  currentUserNickname: string
  isLoggedIn: boolean
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

export default function PostReactions({
  postId,
  initialLiked,
  initialCount,
  initialComments,
  currentUserId,
  currentUserNickname,
  isLoggedIn,
}: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [likePending, setLikePending] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>(initialComments)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleLike = async () => {
    if (!isLoggedIn) {
      setError('로그인이 필요합니다.')
      return
    }
    if (likePending) return
    setLikePending(true)
    // 낙관적 업데이트
    setLiked((v) => !v)
    setCount((c) => c + (liked ? -1 : 1))
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLiked(data.liked)
      setCount(data.count)
    } catch {
      // 실패 시 롤백
      setLiked((v) => !v)
      setCount((c) => c + (liked ? 1 : -1))
    } finally {
      setLikePending(false)
    }
  }

  const submitComment = async () => {
    if (!content.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '댓글 작성에 실패했습니다.')
      setComments((prev) => [
        ...prev,
        { ...data.comment, nickname: currentUserNickname },
      ])
      setContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      })
      if (!res.ok) return
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch {
      // 무시
    }
  }

  return (
    <div className="space-y-5">
      {/* 좋아요 */}
      <button
        type="button"
        onClick={toggleLike}
        className="flex items-center gap-2"
        aria-pressed={liked}
      >
        <span className={`text-2xl ${liked ? 'text-point' : 'text-text/25'}`}>
          {liked ? '♥' : '♡'}
        </span>
        <span className="text-sm text-text/70">{count}</span>
      </button>

      {/* 댓글 */}
      <div>
        <p className="mb-3 text-sm font-medium text-text">
          댓글 {comments.length}
        </p>

        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-text/40">첫 감상평을 남겨보세요.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl bg-surface-muted p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-text/80">{c.nickname}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-text/40">
                    {formatDate(c.created_at)}
                  </span>
                  {currentUserId === c.user_id && (
                    <button
                      type="button"
                      onClick={() => deleteComment(c.id)}
                      className="text-[11px] text-text/30 hover:text-red-400"
                    >
                      삭제
                    </button>
                  )}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-text/80">{c.content}</p>
            </div>
          ))}
        </div>

        {isLoggedIn ? (
          <div className="mt-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              placeholder="감상평이나 후기를 남겨보세요."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-main"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={submitComment}
                disabled={submitting || !content.trim()}
                className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? '등록 중…' : '댓글 등록'}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-text/40">
            댓글을 남기려면 로그인해주세요.
          </p>
        )}
      </div>
    </div>
  )
}
